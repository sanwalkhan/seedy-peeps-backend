import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpStatus,
  HttpCode,
  Param,
  Delete,
  Get,
  Query,
  BadRequestException,
  Put,
} from '@nestjs/common';
import { Request } from 'express';
import { MessageService } from './message.service';
import { CreateMessageDto } from './create-message.dto';
import { Message } from '../../schemas/message.schema';
import { PaginateMessageDto } from './paginate-message.dto';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  async createMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() request,
  ): Promise<any> {
    const userId = request.user?._id;
    try {
      return await this.messageService.createMessage(createMessageDto, userId);
    } catch (error) {
      throw new BadRequestException(
        `Failed to create message: ${error.message}`,
      );
    }
  }

  @Delete(':id')
  async deleteMessage(
    @Param('id') messageId: string,
  ): Promise<{ status: string; message: string }> {
    try {
      await this.messageService.deleteMessage(messageId);
      return {
        status: 'success',
        message: `Message with ID '${messageId}' has been deleted successfully`,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete message: ${error.message}`,
      );
    }
  }

  @Put('mark-all-as-read/:collabId')
  async markAllMessagesAsRead(
    @Param('collabId') collabId: string,
    @Req() req: any,
  ) {
    const userId = req.user._id;
    return this.messageService.markAllMessagesAsRead(collabId, userId);
  }

  @Get('unread-count/:collabId')
  async getUnreadMessageCount(
    @Param('collabId') collabId: string,
    @Req() req: any,
  ) {
    const userId = req.user._id;
    return this.messageService.getUnreadMessageCount(collabId, userId);
  }

  @Get(':collabId')
  async getMessages(
    @Req() req,
    @Param('collabId') collabId: string,
    @Query() paginateDto: PaginateMessageDto,
  ) {
    const userId = req.user._id;
    return this.messageService.getMessagesByCollab(
      userId,
      collabId,
      paginateDto,
    );
  }
}
