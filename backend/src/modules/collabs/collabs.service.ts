import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CollabIndustry } from 'src/schemas/space-industry.schema';
import { Membership } from 'src/schemas/space-members.schema';
import { Collab } from 'src/schemas/space.schema';
import { ImageUploadService } from '../fileUpload/file-upload-service';
import { CreateCollabDto } from './create-collabs.dto';
import { UpdateCollabDto } from './update-collab.dto';
import { NotificationGateway } from 'src/sockets/notification.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from 'src/schemas/user.schema';
import { MessageService } from '../message/message.service';
import { EmailRecord } from 'src/schemas/email-record.schema';
import { MailService } from '../mail/mail.service';
import { PastCollabParticipants } from 'src/schemas/past-collab-participants.schema';

@Injectable()
export class CollabService {
  private readonly logger = new Logger(CollabService.name);

  constructor(
    @InjectModel(Collab.name) private readonly collabModel: Model<Collab>,
    @InjectModel(CollabIndustry.name)
    private readonly collabIndustryModel: Model<CollabIndustry>,
    @InjectModel(Membership.name)
    private readonly membershipModel: Model<Membership>,
    private readonly imageUploadService: ImageUploadService,
    private notificationGateway: NotificationGateway,
    private notificationsService: NotificationsService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly messageService: MessageService,
    @InjectModel('EmailRecord')
    private readonly emailRecordModel: Model<EmailRecord>,
    private readonly mailService: MailService,
    @InjectModel(PastCollabParticipants.name)
    private pastCollabParticipantsModel: Model<PastCollabParticipants>,
  ) {}

  private truncateText(text: string, maxLength: number = 25): string {
    if (text.length <= maxLength) {
      return `"${text}"`;
    }
    return `"${text.substring(0, maxLength)}..."`;
  }

  async createCollab(
    createCollabDto: CreateCollabDto,
    owner: Types.ObjectId,
  ): Promise<Collab> {
    const {
      avatar,
      industries,
      members = [],
      emails = [],
      ...collabData
    } = createCollabDto;
    let avatarUrl = '';

    try {
      if (avatar) {
        const s3Response = await this.imageUploadService.uploadBase64Image(
          avatar,
          `${collabData.name}-avatar`,
          'image/png',
        );
        avatarUrl = s3Response.Location;
      }

      const collab = new this.collabModel({
        ...collabData,
        owner,
        avatar: avatarUrl,
      });
      const createdCollab = await collab.save();

      if (industries && industries.length > 3) {
        throw new BadRequestException(
          'You can select up to 3 industries only.',
        );
      }

      if (industries && industries.length > 0) {
        await this.collabIndustryModel.insertMany(
          industries.map((industryId) => ({
            industry: new Types.ObjectId(industryId),
            collab: createdCollab._id,
          })),
        );
      }

      const memberIds = [...new Set([...members, owner.toString()])].map(
        (id) => new Types.ObjectId(id),
      );

      if (memberIds.length > 0) {
        await this.membershipModel.insertMany(
          memberIds.map((memberId) => ({
            user: memberId,
            collab: createdCollab._id,
          })),
        );
      }

      const ownerDetails = await this.userModel.findById(owner);
      if (!ownerDetails) {
        throw new BadRequestException('Owner not found');
      }
      const ownerFullName = `${ownerDetails.firstName} ${ownerDetails.lastName}`;
      const ownerProfileImage = ownerDetails.profileImage;

      const truncatedCollabName = this.truncateText(createdCollab.name);

      const notificationMessage = {
        message: `You have been added to the collab ${truncatedCollabName} by ${ownerFullName}`,
        collab: {
          id: createdCollab._id,
          name: createdCollab.name,
          avatar: createdCollab.avatar,
        },
        addedBy: owner.toString(),
        type: 'newCollab',
      };

      memberIds.forEach((memberId) => {
        if (!memberId.equals(owner)) {
          this.notificationGateway.notifyUser(
            memberId.toString(),
            notificationMessage,
          );
        }
      });

      const membersWithoutOwner = memberIds.filter((id) => !id.equals(owner));
      await this.notificationsService.sendNotification(
        membersWithoutOwner,
        'New Collab',
        `You have been added to the collab: ${truncatedCollabName} by ${ownerFullName}`,
      );

      const notificationsPayload = membersWithoutOwner.map((memberId) => ({
        title: 'New Collab',
        body: `You have been added to the collab ${truncatedCollabName} by ${ownerFullName}.`,
        clickUrl: `${createdCollab._id}`,
        userId: memberId.toString(),
        actingUser: {
          _id: ownerDetails._id,
          firstName: ownerDetails.firstName,
          lastName: ownerDetails.lastName,
          profileImage: ownerProfileImage,
        },
        collab: {
          _id: createdCollab._id,
          name: createdCollab.name,
          avatar: createdCollab.avatar,
        },
      }));

      await Promise.all(
        notificationsPayload.map((payload) =>
          this.notificationsService.saveNotification(payload),
        ),
      );

      process.nextTick(async () => {
        if (emails.length >= 0) {
          await this.mailService.sendEmailToAll(createdCollab._id, emails);
        }
      });

      const detailedCollab = await this.collabModel
        .aggregate([
          { $match: { _id: createdCollab._id } },
          ...this.getCollabAggregationStages(owner),
        ])
        .exec();
      return detailedCollab[0] || createdCollab;
    } catch (error) {
      console.error('Error creating collab:', error);
      throw new BadRequestException('Failed to create collab');
    }
  }

  async updateCollab(
    userId: string,
    collabId: string,
    updateCollabDto: UpdateCollabDto,
  ): Promise<any> {
    const {
      avatar,
      industries,
      members = [],
      emails = [],
      ...collabData
    } = updateCollabDto;

    let avatarUrl = '';

    try {
      const collabObjectId = new Types.ObjectId(collabId);

      // Ensure only the owner can update the collab
      const isOwner = await this.isCollabOwner(userId, collabId);
      if (!isOwner) {
        throw new UnauthorizedException(
          'You do not have permission to update this collab',
        );
      }

      if (industries && industries.length > 3) {
        throw new BadRequestException(
          'You can select up to 3 industries only.',
        );
      }

      const collab = await this.collabModel.findById(collabObjectId);
      if (!collab) {
        throw new NotFoundException('Collab not found');
      }

      // Handle avatar update
      if (avatar === null) {
        await this.deletePreviousAvatar(collab.avatar);
        collab.avatar = null;
      } else if (avatar && avatar !== collab.avatar) {
        await this.deletePreviousAvatar(collab.avatar);
        const s3Response = await this.imageUploadService.uploadBase64Image(
          avatar,
          `${collabData.name || collab.name}-avatar`,
          'image/png',
        );
        avatarUrl = s3Response.Location;
        collab.avatar = avatarUrl;
      }

      // Handle industries update
      if (industries && industries.length > 0) {
        await this.collabIndustryModel.deleteMany({ collab: collabObjectId });
        await this.collabIndustryModel.insertMany(
          industries.map((industryId) => ({
            industry: new Types.ObjectId(industryId),
            collab: collabObjectId,
          })),
        );
      }

      // Handle members update and past participants logic
      const existingMembers = new Set(
        (await this.membershipModel.find({ collab: collabObjectId })).map(
          (member) => member.user.toString(),
        ),
      );
      const pastParticipants = new Set(
        (
          await this.pastCollabParticipantsModel.find({
            collab: collabObjectId,
          })
        ).map((participant) => participant.user.toString()),
      );

      const membersToAdd = new Set(members.map((m) => m.toString()));

      // Move members between pastParticipants and members
      const membersToRemove = [...existingMembers].filter(
        (memberId) => !membersToAdd.has(memberId),
      );
      const membersToReAdd = [...membersToAdd].filter((memberId) =>
        pastParticipants.has(memberId),
      );

      console.log('Members to remove:', membersToRemove);
      console.log('Members to re-add:', membersToReAdd);

      // Remove members from the current collab and add them to past participants
      if (membersToRemove.length > 0) {
        await this.membershipModel.deleteMany({
          collab: collabObjectId,
          user: { $in: membersToRemove.map((id) => new Types.ObjectId(id)) },
        });

        await this.pastCollabParticipantsModel.insertMany(
          membersToRemove.map((userId) => ({
            user: new Types.ObjectId(userId),
            collab: collabObjectId,
            status: 'removed', // Set status for removed participants
            leftAt: new Date(), // Optional: Set removedAt to current date
            removedBy: new Types.ObjectId(userId), // Optional: Set who removed the user
          })),
        );
      }

      // Re-add members from past participants back to the collab
      if (membersToReAdd.length > 0) {
        await this.pastCollabParticipantsModel.deleteMany({
          collab: collabObjectId,
          user: { $in: membersToReAdd.map((id) => new Types.ObjectId(id)) },
        });

        await this.membershipModel.insertMany(
          membersToReAdd.map((userId) => ({
            user: new Types.ObjectId(userId),
            collab: collabObjectId,
          })),
        );
      }

      // Add new members to the collab
      const newMembers = [...membersToAdd].filter(
        (memberId) =>
          !existingMembers.has(memberId) && !pastParticipants.has(memberId),
      );
      if (newMembers.length > 0) {
        await this.membershipModel.insertMany(
          newMembers.map((userId) => ({
            user: new Types.ObjectId(userId),
            collab: collabObjectId,
          })),
        );
      }

      // Update basic collab fields
      const updateQuery: any = {};
      if (collabData.name) {
        updateQuery.name = collabData.name;
      }
      if (collabData.bio) {
        updateQuery.bio = collabData.bio;
      }
      if (collabData.visibility) {
        updateQuery.visibility = collabData.visibility;
      }

      if (Object.keys(updateQuery).length > 0) {
        await this.collabModel.updateOne(
          { _id: collabObjectId },
          { $set: updateQuery },
          { timestamps: false },
        );
      }

      // Fetch and return updated collab details
      const updatedCollabDetails = await this.collabModel
        .aggregate([
          { $match: { _id: collabObjectId } },
          ...this.getCollabAggregationStages(new Types.ObjectId(userId)),
        ])
        .exec();

      const response = updatedCollabDetails[0] || collab;

      // Asynchronously send email notifications
      process.nextTick(async () => {
        try {
          const ownerDetails = await this.userModel.findById(userId);
          if (ownerDetails && emails.length >= 0) {
            await this.mailService.sendEmailToAll(collabObjectId, emails);
          }
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      });

      return response;
    } catch (error) {
      console.error('Error updating collab:', error);
      if (error.code === 11000) {
        this.logger.error(
          `Collab with the name '${collabData.name}' already exists`,
        );
        throw new BadRequestException(
          `Collab with the name '${collabData.name}' already exists`,
        );
      }
      throw new BadRequestException('Failed to update collab');
    }
  }

  async deletePreviousAvatar(avatarUrl: string) {
    try {
      // Extract file name from URL
      const fileName = avatarUrl.split('/').pop();
      if (!fileName) {
        throw new Error('Invalid avatar URL');
      }

      // Delete file from S3
      await this.imageUploadService.deleteFile(fileName);
    } catch (error) {
      this.logger.error(
        `Failed to delete previous avatar: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to delete previous avatar');
    }
  }

  async isCollabOwner(userId: string, collabId: string): Promise<boolean> {
    const collab = await this.collabModel
      .findById(collabId)
      .populate('owner', '_id');
    if (!collab) {
      throw new NotFoundException('Collab not found');
    }

    const ownerId = collab.owner._id.toString();
    const isOwner = String(ownerId) === String(userId);

    return isOwner;
  }

  async deleteCollab(userId: string, collabId: string): Promise<any> {
    try {
      // Check if the user is the owner of the collab
      const isOwner = await this.isCollabOwner(userId, collabId);
      if (!isOwner) {
        throw new UnauthorizedException(
          'You do not have permission to delete this collab',
        );
      }

      // Find and mark the collab as deleted
      const collab = await this.collabModel.findById(collabId);
      if (!collab) {
        throw new NotFoundException('Collab not found');
      }

      collab.isDeleted = true;
      await collab.save();

      const detailedCollab = await this.collabModel
        .aggregate(this.getCollabAggregationStages(new Types.ObjectId(userId)))
        .match({ _id: new Types.ObjectId(collabId) })
        .exec();

      return detailedCollab[0] || collab;
    } catch (error) {
      this.logger.error(
        `Failed to delete collab: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to delete collab');
    }
  }

  private getCollabAggregationStages(userId: Types.ObjectId): any[] {
    return [
      {
        $lookup: {
          from: 'memberships',
          localField: '_id',
          foreignField: 'collab',
          as: 'memberships',
        },
      },
      {
        $addFields: {
          memberCount: { $size: '$memberships' },
          joined: {
            $in: [userId, '$memberships.user'],
          },
        },
      },
      {
        $lookup: {
          from: 'collabindustries',
          localField: '_id',
          foreignField: 'collab',
          as: 'industries',
        },
      },
      {
        $lookup: {
          from: 'industrytitles',
          localField: 'industries.industry',
          foreignField: '_id',
          as: 'industryDetails',
        },
      },
      {
        $unwind: '$industryDetails',
      },
      {
        $sort: {
          'industryDetails.createdAt': 1,
        },
      },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          bio: { $first: '$bio' },
          owner: { $first: '$owner' },
          visibility: { $first: '$visibility' },
          avatar: { $first: '$avatar' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          isDeleted: { $first: '$isDeleted' },
          memberCount: { $first: '$memberCount' },
          memberships: { $first: '$memberships' },
          industries: {
            $addToSet: {
              _id: '$industryDetails._id',
              title: '$industryDetails.title',
            },
          },
          joined: { $first: '$joined' },
        },
      },
      {
        $addFields: {
          industries: {
            $sortArray: {
              input: '$industries',
              sortBy: { title: 1 },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'memberships.user',
          foreignField: '_id',
          as: 'members',
        },
      },
      {
        $lookup: {
          from: 'messages',
          let: { collabId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$collab', '$$collabId'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user',
              },
            },
            { $unwind: '$user' },
            {
              $project: {
                _id: 1,
                content: 1,
                updatedAt: 1,
                user: {
                  _id: 1,
                  firstName: 1,
                  lastName: 1,
                  profileImage: 1,
                },
              },
            },
          ],
          as: 'lastMessage',
        },
      },
      {
        $unwind: {
          path: '$lastMessage',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'pastcollabparticipants',
          localField: '_id',
          foreignField: 'collab',
          as: 'pastParticipants',
        },
      },
      {
        $addFields: {
          leftAt: {
            $let: {
              vars: {
                pastParticipant: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$pastParticipants',
                        as: 'participant',
                        cond: { $eq: ['$$participant.user', userId] },
                      },
                    },
                    0,
                  ],
                },
              },
              in: {
                $ifNull: ['$$pastParticipant.leftAt', null],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'emailrecords',
          let: { collabId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$collab', { $toObjectId: '$$collabId' }] },
                    { $eq: ['$expired', false] },
                    { $eq: ['$joined', false] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                recipient: 1,
              },
            },
          ],
          as: 'invitedMembers',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          bio: 1,
          owner: 1,
          visibility: 1,
          avatar: 1,
          createdAt: 1,
          updatedAt: 1,
          isDeleted: 1,
          memberCount: 1,
          members: {
            $map: {
              input: '$members',
              as: 'member',
              in: {
                _id: '$$member._id',
                firstName: '$$member.firstName',
                lastName: '$$member.lastName',
                profileImage: '$$member.profileImage',
                email: '$$member.email',
              },
            },
          },
          industries: {
            $map: {
              input: '$industries',
              as: 'industry',
              in: {
                _id: '$$industry._id',
                title: '$$industry.title',
              },
            },
          },
          lastMessage: 1,
          joined: 1,
          invitedMembers: {
            $map: {
              input: '$invitedMembers',
              as: 'invited',
              in: '$$invited.recipient',
            },
          },
          leftAt: 1,
        },
      },
      {
        $sort: {
          leftAt: 1, // Sort collabs where the user has left last
          updatedAt: -1, // Then sort by most recent update
        },
      },
    ];
  }

  async getAllCollabs(loggedInUserId: Types.ObjectId): Promise<Collab[]> {
    const stages = this.getCollabAggregationStages(loggedInUserId);
    stages.push({
      $sort: { createdAt: -1 },
    });
    return this.collabModel.aggregate(stages).exec();
  }

  async getTopCollabs(loggedInUserId: Types.ObjectId): Promise<Collab[]> {
    const stages = this.getCollabAggregationStages(loggedInUserId);
    stages.unshift(
      {
        $match: {
          visibility: 'public',
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    );
    stages.push(
      {
        $match: {
          joined: false,
        },
      },
      {
        $sort: { memberCount: -1 },
      },
      {
        $limit: 5,
      },
    );
    return this.collabModel.aggregate(stages).exec();
  }

  async getUserCollabs(userId: Types.ObjectId): Promise<any[]> {
    const stages = this.getUserCollabAggregationStages(userId);

    // Execute the aggregation to get the collabs
    const collabs = await this.collabModel.aggregate(stages).exec();

    // Fetch unread message count for each collab
    const collabsWithUnreadCount = await Promise.all(
      collabs.map(async (collab) => {
        const unreadCount = await this.messageService.getUnreadMessageCount(
          collab._id.toString(),
          userId.toString(),
        );
        return {
          ...collab,
          unreadMessageCount: unreadCount,
        };
      }),
    );

    return collabsWithUnreadCount;
  }

  private getUserCollabAggregationStages(userId: Types.ObjectId): any[] {
    return [
      // Lookup memberships to find collabs the user is a current member of
      {
        $lookup: {
          from: 'memberships',
          localField: '_id',
          foreignField: 'collab',
          as: 'memberships',
        },
      },
      {
        $lookup: {
          from: 'pastcollabparticipants',
          localField: '_id',
          foreignField: 'collab',
          as: 'pastParticipants',
        },
      },
      // Add fields to check membership status and capture leftAt date
      {
        $addFields: {
          memberCount: { $size: '$memberships' },
          isCurrentMember: { $in: [userId, '$memberships.user'] },
          leftAt: {
            $let: {
              vars: {
                pastParticipant: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$pastParticipants',
                        as: 'participant',
                        cond: { $eq: ['$$participant.user', userId] },
                      },
                    },
                    0,
                  ],
                },
              },
              in: {
                $ifNull: ['$$pastParticipant.leftAt', null],
              },
            },
          },
          status: {
            $let: {
              vars: {
                pastParticipant: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$pastParticipants',
                        as: 'participant',
                        cond: { $eq: ['$$participant.user', userId] },
                      },
                    },
                    0,
                  ],
                },
              },
              in: {
                $ifNull: ['$$pastParticipant.status', null],
              },
            },
          },
        },
      },
      // Match to filter only those collabs where the user is a member or has left
      {
        $match: {
          $or: [{ isCurrentMember: true }, { leftAt: { $ne: null } }],
        },
      },
      // Lookup additional details for collab industries
      {
        $lookup: {
          from: 'collabindustries',
          localField: '_id',
          foreignField: 'collab',
          as: 'industries',
        },
      },
      {
        $lookup: {
          from: 'industrytitles',
          localField: 'industries.industry',
          foreignField: '_id',
          as: 'industryDetails',
        },
      },
      {
        $unwind: '$industryDetails',
      },
      {
        $sort: {
          'industryDetails.createdAt': 1,
        },
      },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          bio: { $first: '$bio' },
          owner: { $first: '$owner' },
          visibility: { $first: '$visibility' },
          avatar: { $first: '$avatar' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          isDeleted: { $first: '$isDeleted' },
          memberCount: { $first: '$memberCount' },
          memberships: { $first: '$memberships' },
          industries: {
            $addToSet: {
              _id: '$industryDetails._id',
              title: '$industryDetails.title',
            },
          },
          isCurrentMember: { $first: '$isCurrentMember' },
          leftAt: { $first: '$leftAt' },
          status: { $first: '$status' },
        },
      },
      {
        $addFields: {
          sortOrder: {
            $cond: {
              if: { $eq: ['$isCurrentMember', true] },
              then: '$updatedAt',
              else: '$leftAt',
            },
          },
        },
      },
      {
        $sort: {
          sortOrder: -1,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'memberships.user',
          foreignField: '_id',
          as: 'members',
        },
      },
      {
        $lookup: {
          from: 'messages',
          let: { collabId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$collab', '$$collabId'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'user',
              },
            },
            { $unwind: '$user' },
            {
              $project: {
                _id: 1,
                content: 1,
                updatedAt: 1,
                user: {
                  _id: 1,
                  firstName: 1,
                  lastName: 1,
                  profileImage: 1,
                },
              },
            },
          ],
          as: 'lastMessage',
        },
      },
      {
        $unwind: {
          path: '$lastMessage',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'emailrecords',
          let: { collabId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$collab', { $toObjectId: '$$collabId' }] },
                    { $eq: ['$expired', false] },
                    { $eq: ['$joined', false] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                recipient: 1,
              },
            },
          ],
          as: 'invitedMembers',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          bio: 1,
          owner: 1,
          visibility: 1,
          avatar: 1,
          createdAt: 1,
          updatedAt: 1,
          isDeleted: 1,
          memberCount: 1,
          members: {
            $map: {
              input: '$members',
              as: 'member',
              in: {
                _id: '$$member._id',
                firstName: '$$member.firstName',
                lastName: '$$member.lastName',
                profileImage: '$$member.profileImage',
                email: '$$member.email',
              },
            },
          },
          industries: {
            $map: {
              input: '$industries',
              as: 'industry',
              in: {
                _id: '$$industry._id',
                title: '$$industry.title',
              },
            },
          },
          lastMessage: 1,
          isCurrentMember: 1,
          invitedMembers: {
            $map: {
              input: '$invitedMembers',
              as: 'invited',
              in: '$$invited.recipient',
            },
          },
          leftAt: 1,
          status: 1,
        },
      },
    ];
  }

  async searchCollabsByName(
    keyword: string,
    page: number,
    limit: number,
    userId: Types.ObjectId,
  ): Promise<{ collabs: any[]; count: number }> {
    const collabs = await this.collabModel.aggregate([
      {
        $match: {
          $or: [
            { name: { $regex: keyword, $options: 'i' } },
            // { bio: { $regex: keyword, $options: 'i' } },
          ],
        },
      },
      {
        $lookup: {
          from: 'memberships',
          localField: '_id',
          foreignField: 'collab',
          as: 'memberships',
        },
      },
      {
        $addFields: {
          memberCount: { $size: '$memberships' },
          joined: {
            $in: [userId, '$memberships.user'],
          },
        },
      },
      {
        $lookup: {
          from: 'collabindustries',
          localField: '_id',
          foreignField: 'collab',
          as: 'industries',
        },
      },
      {
        $lookup: {
          from: 'industrytitles',
          localField: 'industries.industry',
          foreignField: '_id',
          as: 'industryDetails',
        },
      },
      {
        $unwind: {
          path: '$industryDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          'industryDetails.createdAt': 1,
        },
      },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          bio: { $first: '$bio' },
          owner: { $first: '$owner' },
          visibility: { $first: '$visibility' },
          avatar: { $first: '$avatar' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          industries: {
            $addToSet: {
              _id: '$industryDetails._id',
              title: '$industryDetails.title',
              createdAt: '$industryDetails.createdAt',
            },
          },
          memberCount: { $first: '$memberCount' },
          joined: { $first: '$joined' },
        },
      },
      {
        $addFields: {
          industries: {
            $sortArray: {
              input: '$industries',
              sortBy: { createdAt: 1 },
            },
          },
        },
      },
      {
        $sort: { name: 1 },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
    ]);

    const count = await this.collabModel.countDocuments({
      $or: [
        { name: { $regex: keyword, $options: 'i' } },
        { bio: { $regex: keyword, $options: 'i' } },
      ],
    });

    return { collabs, count };
  }

  async addUserToPublicCollab(
    collabId: string,
    userId: string,
  ): Promise<Collab> {
    try {
      const collab = await this.collabModel.findOne({
        _id: collabId,
        visibility: 'public',
      });

      if (!collab) {
        throw new NotFoundException('Public Collab not found');
      }

      const userObjectId = new Types.ObjectId(userId);
      const existingMembership = await this.membershipModel.findOne({
        collab: collab._id,
        user: userObjectId,
      });

      if (existingMembership) {
        throw new BadRequestException('User is already a member of the collab');
      }

      const membership = new this.membershipModel({
        user: userObjectId,
        collab: collab._id,
      });

      await membership.save();

      return collab;
    } catch (error) {
      this.logger.error(
        `Failed to add user to collab: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to add user to collab');
    }
  }

  async getCollabById(
    collabId: string,
    loggedInUserId: Types.ObjectId,
  ): Promise<Collab | null> {
    const objectId = new Types.ObjectId(collabId);
    const stages = this.getCollabAggregationStages(loggedInUserId);
    stages.unshift({
      $match: { _id: objectId },
    });

    const result = await this.collabModel.aggregate(stages).exec();
    return result.length > 0 ? result[0] : null;
  }

  async joinInvitedMember(
    userId: string,
    email: string,
    collabId: string,
  ): Promise<any> {
    try {
      const collabObjectId = new Types.ObjectId(collabId);
      const userObjectId = new Types.ObjectId(userId);

      const collab = await this.collabModel.findById(collabObjectId);
      if (!collab) {
        throw new NotFoundException(`Collab with ID ${collabId} not found.`);
      }

      const invitation = await this.emailRecordModel.findOne({
        collab: collabObjectId,
        recipient: email,
        expired: false,
      });

      if (!invitation) {
        throw new ForbiddenException(`expired`);
      }

      if (invitation.joined) {
        throw new ConflictException(`already joined`);
      }

      const existingMembership = await this.membershipModel.findOne({
        user: userObjectId,
        collab: collabObjectId,
      });

      if (existingMembership) {
        throw new ConflictException(`already member`);
      }

      // Add the user back to the membership model
      await this.membershipModel.create({
        user: userObjectId,
        collab: collabObjectId,
      });

      await this.emailRecordModel.updateOne(
        { _id: invitation._id },
        { $set: { joined: true } },
      );

      return this.collabModel
        .aggregate(this.getCollabAggregationStages(userObjectId))
        .match({ _id: collabObjectId })
        .exec();
    } catch (error) {
      this.logger.error(`Failed to join collab: ${error.message}`, error.stack);
      throw error;
    }
  }

  async leaveCollab(userId: string, collabId: string): Promise<Collab | null> {
    const userObjectId = new Types.ObjectId(userId);
    const collabObjectId = new Types.ObjectId(collabId);

    // Find the membership document
    const membership = await this.membershipModel.findOne({
      user: userObjectId,
      collab: collabObjectId,
    });

    if (!membership) {
      throw new BadRequestException('User is not a member of this collab');
    }

    // Check if the user is the owner of the collab
    const collab = await this.collabModel.findById(collabObjectId);
    if (!collab) {
      throw new BadRequestException('Collab not found');
    }

    if (collab.owner.toString() === userObjectId.toString()) {
      throw new ForbiddenException('Owner cannot leave the collab');
    }

    // Remove the user's membership document
    await this.membershipModel.deleteOne({
      user: userObjectId,
      collab: collabObjectId,
    });

    // Add entry to the pastCollabParticipants collection
    await this.pastCollabParticipantsModel.create({
      user: userObjectId,
      collab: collabObjectId,
      leftAt: new Date(),
      status: 'left',
    });

    // Fetch updated collab details
    const detailedCollab = await this.collabModel
      .aggregate([
        { $match: { _id: collabObjectId } },
        ...this.getCollabAggregationStages(userObjectId),
      ])
      .exec();

    return detailedCollab.length > 0 ? detailedCollab[0] : null;
  }
}
