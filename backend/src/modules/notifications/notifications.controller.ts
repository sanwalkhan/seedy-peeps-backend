import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Post('/expotoken')
  async addExpoTokenToDatabase(
    @Body() notificationBody: { token: string },
    @Req() request,
    @Res() response,
  ) {
    try {
      const data = await this.notificationsService.addTokenToDatabase(
        notificationBody.token,
        request.user._id,
      );
      return response.status(HttpStatus.OK).json({
        statusCode: 200,
        data,
      });
    } catch (error) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'Failed to update expo token!',
      });
    }
  }

  @Get('unread-count')
  async getUnreadNotificationsCount(
    @Req() request,
  ): Promise<{ statusCode: number; data?: any; message?: string }> {
    try {
      const userId = request.user._id;
      const unreadCount =
        await this.notificationsService.getUnreadNotificationsCount(userId);
      return {
        statusCode: HttpStatus.OK,
        data: { count: unreadCount },
      };
    } catch (error) {
      console.error('Error retrieving unread notifications count:', error); // Log the error
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Failed to retrieve unread notifications count!',
      };
    }
  }

  @Get()
  async getAllNotifications(
    @Req() request,
    @Query('page') page = 1,
    @Query('limit') limit = 10
  ) {
    try {
      const userId = request.user._id;
      const notifications = await this.notificationsService.getAllNotifications(userId, +page, +limit);
      return {
        statusCode: HttpStatus.OK,
        data: notifications,
      };
    } catch (error) {
      console.error('Failed to retrieve notifications:', error);
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Failed to retrieve notifications!',
      };
    }
  }


  @Patch('/:id/read')
  async readNotification(@Param('id') id: string, @Res() response) {
    try {
      const notification = await this.notificationsService.readNotification(id);
      return response.status(HttpStatus.OK).json({
        statusCode: 200,
        data: notification,
      });
    } catch (error) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'Failed to mark notification as read!',
      });
    }
  }

  @Patch('/read-all')
  async readAllNotifications(@Req() request, @Res() response) {
    try {
      const userId = request.user._id;
      await this.notificationsService.readAllNotifications(userId);
      return response.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'All notifications marked as read!',
      });
    } catch (error) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'Failed to mark all notifications as read!',
      });
    }
  }
}
