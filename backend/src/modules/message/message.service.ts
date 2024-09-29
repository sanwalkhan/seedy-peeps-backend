import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ImageUploadService } from '../fileUpload/file-upload-service';
import { Message } from '../../schemas/message.schema';
import { User } from '../../schemas/user.schema';
import { Collab } from '../../schemas/space.schema';
import { CreateMessageDto } from './create-message.dto';
import { PaginateMessageDto } from './paginate-message.dto';
import { CollabGateway } from 'src/sockets/collab.gateway';
import { NotificationGateway } from 'src/sockets/notification.gateway';
import { Membership } from 'src/schemas/space-members.schema';
import { MessageReadStatus } from 'src/schemas/messagereadstatus.schema';
import { PastCollabParticipants } from 'src/schemas/past-collab-participants.schema';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(Collab.name) private readonly collabModel: Model<Collab>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<Membership>,
    @InjectModel(MessageReadStatus.name)
    private readonly messageReadStatusModel: Model<MessageReadStatus>,
    @InjectModel(PastCollabParticipants.name)
    private readonly pastCollabParticipantsModel: Model<PastCollabParticipants>,

    private readonly imageUploadService: ImageUploadService,
    private readonly collabGateway: CollabGateway,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  private truncateText(text: string, maxLength: number = 25): string {
    if (text.length <= maxLength) {
      return `"${text}"`;
    }
    return `"${text.substring(0, maxLength)}..."`;
  }

  async createMessage(
    createMessageDto: CreateMessageDto,
    userId: string,
  ): Promise<Message> {
    const { collabId, content, attachments } = createMessageDto;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    try {
      const userObjectId = new Types.ObjectId(userId);
      const collabObjectId = new Types.ObjectId(collabId);

      // Check if the user is a member of the collab and has not left
      const membership = await this.membershipModel.findOne({
        collab: collabObjectId,
        user: userObjectId,
      });

      if (!membership) {
        throw new ForbiddenException(
          'User is not a member of this collab or has left',
        );
      }

      // Create and save the message
      const newMessage = new this.messageModel({
        user: userObjectId,
        collab: collabObjectId,
        content,
        attachments,
      });
      const savedMessage = await newMessage.save();

      // Update the collab's lastMessage property
      const updatedCollab = await this.collabModel
        .findByIdAndUpdate(
          collabObjectId,
          { lastMessage: savedMessage._id },
          { new: true, useFindAndModify: false },
        )
        .populate('lastMessage');
      if (!updatedCollab) {
        throw new BadRequestException('Collab not found');
      }

      // Populate the user field in the message
      const populatedMessage = await savedMessage.populate('user');

      // Get all members
      const memberships = await this.membershipModel
        .find({ collab: collabObjectId })
        .populate('user');
      const members = memberships
        .map((membership) => membership.user)
        .filter((user) => user !== null);

      // Track message read statuses
      const messageReadStatuses = members
        .filter((member) => member._id.toString() !== userId) // Exclude the sender
        .map((member) => ({
          message: savedMessage._id,
          user: member._id,
          collab: collabObjectId,
          read: false, // Default value
        }));

      await this.messageReadStatusModel.insertMany(messageReadStatuses);

      // Emit the new message event excluding the sender
      console.log('emitted socket ', populatedMessage);
      this.collabGateway.server.to(collabId).except(userId).emit('newMessage', {
        user: populatedMessage.user,
        collab: updatedCollab._id,
        content: populatedMessage.content,
        attachments: populatedMessage.attachments,
        _id: populatedMessage._id,
      });

      // Prepare and send notification messages
      const sender = await this.userModel.findById(userId);
      if (!sender) {
        throw new BadRequestException('Sender not found');
      }
      const senderFullName = `${sender.firstName} ${sender.lastName}`;
      const collabNameTruncated = this.truncateText(updatedCollab.name);

      const notificationMessage = {
        message: `${senderFullName} sent a ${content !== '' ? 'message' : 'attachment'} in ${collabNameTruncated}`,
        content,
        attachments: attachments,
        collab: {
          id: collabId,
          name: updatedCollab.name,
          avatar: updatedCollab.avatar,
        },
        sender: userId,
      };

      const memberIds = members.map((member) => member._id.toString());

      // Send notifications to all members except the sender
      await this.notificationGateway.notifyMembers(
        memberIds,
        userId,
        notificationMessage,
      );

      return populatedMessage;
    } catch (error) {
      throw new InternalServerErrorException('Failed to create message');
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.messageModel.findByIdAndDelete(messageId);
  }

  async getMessagesByCollab(
    userId: string,
    collabId: string,
    paginateDto: PaginateMessageDto,
  ): Promise<{ messages: Message[]; totalPages: number }> {
    const { page = 1, limit = 10 } = paginateDto;
    const skip = (page - 1) * limit;

    try {
      const userObjectId = new Types.ObjectId(userId);
      const collabObjectId = new Types.ObjectId(collabId);

      // Check if the user has left or been removed from the collab
      const pastParticipant = await this.pastCollabParticipantsModel.findOne({
        user: userObjectId,
        collab: collabObjectId,
      });

      // Build the query
      const query: any = { collab: collabObjectId };

      // If the user has left or been removed, filter messages by `leftAt` or `removedAt`
      if (pastParticipant) {
        if (pastParticipant.leftAt) {
          query.createdAt = { $lte: pastParticipant.leftAt };
        } else if (pastParticipant.removedAt) {
          query.createdAt = { $lte: pastParticipant.removedAt };
        }
      }

      // Get total number of messages
      const totalMessages = await this.messageModel
        .countDocuments(query)
        .exec();
      const totalPages = Math.ceil(totalMessages / limit);

      const messages = await this.messageModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user')
        .exec();

      return { messages, totalPages };
    } catch (error) {
      throw new BadRequestException(
        `Failed to retrieve messages: ${error.message}`,
      );
    }
  }

  async markAllMessagesAsRead(collabId: string, userId: string): Promise<void> {
    const collabObjectId = new Types.ObjectId(collabId);
    const userObjectId = new Types.ObjectId(userId);

    await this.messageReadStatusModel
      .updateMany(
        { collab: collabObjectId, user: userObjectId, read: false },
        { $set: { read: true } },
      )
      .exec();
  }

  async getUnreadMessageCount(
    collabId: string,
    userId: string,
  ): Promise<number> {
    const collabObjectId = new Types.ObjectId(collabId);
    const userObjectId = new Types.ObjectId(userId);

    return this.messageReadStatusModel
      .countDocuments({
        collab: collabObjectId,
        user: userObjectId,
        read: false,
      })
      .exec();
  }
}
