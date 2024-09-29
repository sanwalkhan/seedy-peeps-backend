import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { ToggleReactionDto } from './reaction.dto';
import { Reaction } from 'src/schemas/reaction.schema';
import { NotificationGateway } from 'src/sockets/notification.gateway';
import { User } from 'src/schemas/user.schema';
import { Post } from 'src/schemas/post.schema';
import { NotificationsService } from 'src/modules/notifications/notifications.service';

@Injectable()
export class ReactionService {
  constructor(
    @InjectModel(Reaction.name) private readonly reactionModel: Model<Reaction>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    private readonly notificationGateway: NotificationGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  private truncateText(text: string, maxLength: number = 25): string {
    if (text.length <= maxLength) {
      return `"${text}"`;
    }
    return `"${text.substring(0, maxLength)}..."`;
  }

  async toggleReaction(
    userId: string,
    toggleReactionDto: ToggleReactionDto,
  ): Promise<any> {
    const { postId, emoji, emojiName } = toggleReactionDto;

    const postObjectId = new mongoose.Types.ObjectId(postId);

    try {
      // Check if the reaction already exists
      const existingReaction = await this.reactionModel
        .findOne({
          user: new mongoose.Types.ObjectId(userId),
          post: postObjectId,
          emoji: emoji,
          emojiName: emojiName,
        })
        .exec();

      const user = await this.userModel.findById(userId).exec();
      const post = await this.postModel
        .findById(postObjectId)
        .populate('user')
        .exec();

      if (!post) {
        console.error('Post not found:', postId);
        throw new BadRequestException('Post not found');
      }

      const postOwnerId = post.user._id;

      if (existingReaction) {
        // If the reaction matches, delete it
        await this.reactionModel.findByIdAndDelete(existingReaction._id).exec();

        return {
          statusCode: 200,
          message: `Successfully removed ${emoji}`,
        };
      } else {
        // No existing reaction, create a new reaction
        const newReaction = new this.reactionModel({
          user: new mongoose.Types.ObjectId(userId),
          post: postObjectId,
          emoji,
          emojiName,
        });

        await newReaction.save();

        // Populate user details in the new reaction
        await newReaction.populate('user');

        // Notify the post owner, but not the reacting user
        // console.log('Reacting User ID:', new mongoose.Types.ObjectId(userId));
        // console.log('Post Owner ID:', postOwnerId);

        if (!postOwnerId.equals(new mongoose.Types.ObjectId(userId))) {
          const truncatedCaption = this.truncateText(post.caption);

          const message =
            truncatedCaption.length > 2
              ? `${user.firstName} ${user.lastName} reacted with ${emoji} to your post${truncatedCaption.length > 2 && ' ' + truncatedCaption}`
              : `${user.firstName} ${user.lastName} reacted with ${emoji} to your post`;

          const eventPayload = {
            type: 'reaction',
            message,
            post,
            user,
            reacted: true,
          };

          // console.log('Event Payload:', eventPayload); // Log the event payload

          this.notificationGateway.notifyUser(
            postOwnerId.toString(),
            eventPayload,
          );

          // Save the notification in the database only if the user is not reacting to their own post
          const notificationPayload = {
            title: 'New Reaction',
            body: message,
            clickUrl: `${post._id}`,
            userId: postOwnerId.toString(),
            actingUser: {
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImage: user.profileImage,
            },
          };

          // console.log('Notification Payload:', notificationPayload);

          await this.notificationsService.saveNotification(notificationPayload);
        }

        return newReaction;
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      throw new BadRequestException('Failed to toggle reaction');
    }
  }
}
