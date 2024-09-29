import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Boost } from 'src/schemas/boost.schema';
import { Post } from 'src/schemas/post.schema';
import { User } from 'src/schemas/user.schema';
import { NotificationGateway } from 'src/sockets/notification.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BoostService {
  constructor(
    @InjectModel(Boost.name) private readonly boostModel: Model<Boost>,
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly notificationGateway: NotificationGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  private formatCaption(caption: string): string {
    if (!caption) {
      return '';
    }
    if (caption.length > 25) {
      return `"${caption.substring(0, 25)}..."`;
    }
    return `"${caption}"`;
  }

  async boostPost(userId: string, postId: string): Promise<any> {
    try {
      const postObjectId = new Types.ObjectId(postId);

      // Retrieve and populate the post with all relevant details
      const post = await this.postModel
        .findById(postObjectId)
        .populate('user', 'boostScore caption attachment')
        .exec();

      if (!post) {
        console.error('Post not found:', postId);
        throw new NotFoundException('Post not found');
      }

      if (!post.user) {
        console.error('Post user not found:', postId);
        throw new NotFoundException('Post user not found');
      }

      const postOwnerId = post.user._id;
      const boostScoreIncrement = 1;

      const existingBoost = await this.boostModel.findOne({
        user: new Types.ObjectId(userId),
        post: postObjectId,
      });

      const user = await this.userModel.findById(userId).exec();

      if (existingBoost) {
        // If boost exists, remove it and decrement the scores
        await Promise.all([
          this.boostModel.deleteOne({
            user: new Types.ObjectId(userId),
            post: postObjectId,
          }),
          this.postModel.findByIdAndUpdate(postObjectId, {
            $inc: { boostScore: -boostScoreIncrement },
          }),
          this.userModel.findByIdAndUpdate(postOwnerId, {
            $inc: { boostScore: -boostScoreIncrement },
          }),
        ]);

        return {
          statusCode: HttpStatus.OK,
          message: 'Boost removed successfully',
          boosted: false,
        };
      } else {
        const newBoost = new this.boostModel({
          user: new Types.ObjectId(userId),
          post: postObjectId,
        });

        await newBoost.save();

        await Promise.all([
          this.postModel.findByIdAndUpdate(postObjectId, {
            $inc: { boostScore: boostScoreIncrement },
          }),
          this.userModel.findByIdAndUpdate(postOwnerId, {
            $inc: { boostScore: boostScoreIncrement },
          }),
        ]);

        // Notify the post owner if the user is not boosting their own post
        // console.log('Boosting User ID:', new Types.ObjectId(userId));
        // console.log('Post Owner ID:', postOwnerId);

        if (!postOwnerId.equals(new Types.ObjectId(userId))) {
          const formattedCaption = this.formatCaption(post.caption);
          const message = `${user.firstName} ${user.lastName} boosted your post${formattedCaption && ' ' + formattedCaption}`;

          const eventPayload = {
            type: 'boost',
            message,
            post,
            user,
            boosted: true,
          };

          // console.log('Event Payload:', eventPayload); // Log the event payload

          this.notificationGateway.notifyUser(
            postOwnerId.toString(),
            eventPayload,
          );

          // Save notification in the database with populated post details
          const notificationPayload = {
            title: 'Post Boosted',
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

        return {
          statusCode: HttpStatus.OK,
          message: 'Boost added successfully',
          boosted: true,
        };
      }
    } catch (error) {
      console.error('Failed to boost post:', error);
      throw new Error('Failed to boost post');
    }
  }
}
