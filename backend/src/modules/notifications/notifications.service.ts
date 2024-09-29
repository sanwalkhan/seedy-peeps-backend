import { Injectable } from '@nestjs/common';
import { Expo } from 'expo-server-sdk';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { IUser } from 'src/modules/user/user.interface';
import { Notification } from 'src/schemas/notification.schema';

@Injectable()
export class NotificationsService {
  private expo: Expo;

  constructor(
    @InjectModel('User') private userModel: Model<IUser>,
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
  ) {
    this.expo = new Expo();
  }

  async addTokenToDatabase(token: string, userId: string): Promise<IUser> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { expo_token: token },
      { new: true },
    );
    return user;
  }

  async sendNotification(
    userIds: mongoose.Types.ObjectId[],
    title: string,
    body: string,
  ): Promise<any> {
    try {
      const messages = [];
      const usersWithTokens = await this.userModel
        .find({
          _id: { $in: userIds },
          expo_token: { $exists: true, $ne: null },
        })
        .select('expo_token');

      for (const user of usersWithTokens) {
        const pushToken = user.expo_token;

        if (!Expo.isExpoPushToken(pushToken)) {
          console.error(
            `Push token ${pushToken} is not a valid Expo push token`,
          );
          continue;
        }

        messages.push({
          to: pushToken,
          sound: 'default',
          body: body,
          data: { withSome: 'data' },
          title: title,
        });
      }

      const ticketChunk = await this.expo.sendPushNotificationsAsync(messages);
      // console.log(ticketChunk);
      return { message: 'Successful', status: 200 };
    } catch (e) {
      console.error(e);
      return {
        message: 'Failed',
        error: e.message,
      };
    }
  }

  async saveNotification(notificationData: {
    title: string;
    body: string;
    clickUrl: string;
    userId: string;
    actingUser: {
      _id: mongoose.Types.ObjectId;
      firstName: string;
      lastName: string;
      profileImage: string;
    };
  }): Promise<Notification> {
    const { userId, ...rest } = notificationData;
    const notification = new this.notificationModel({
      ...rest,
      user: userId,
    });
    return await notification.save();
  }

  async getAllNotifications(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    items: Notification[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find({ user: userId })
        .populate('user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments({ user: userId }).exec(),
    ]);

    return {
      items: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async readNotification(notificationId: string): Promise<Notification> {
    return this.notificationModel
      .findByIdAndUpdate(
        notificationId,
        { $set: { read: true } },
        { new: true },
      )
      .exec();
  }

  async readAllNotifications(userId: string): Promise<any> {
    return this.notificationModel
      .updateMany({ user: userId }, { $set: { read: true } })
      .exec();
  }

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    try {
      // console.log('Received userId:', userId);

      // Convert string to ObjectId
      const objectId = new Types.ObjectId(userId);

      // console.log('Converted ObjectId:', objectId);

      // Query notifications where user matches and read is false
      const count = await this.notificationModel
        .countDocuments({ user: objectId, read: false })
        .exec();

      // console.log('Unread notifications count:', count);

      return count;
    } catch (error) {
      // Handle potential conversion errors
      // console.error('Error converting userId to ObjectId:', error);
      throw new Error('Invalid user ID format.');
    }
  }
}
