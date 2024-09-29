import { Controller, Post, Param, Body } from '@nestjs/common';
import { MailService } from './mail.service';
import { Types } from 'mongoose';

@Controller('collabs')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send-invite/:collabId')
  async sendEmail(
    @Param('collabId') collabId: string,
    @Body('emails') emails: string[],
  ) {
    const result = await this.mailService.sendEmail(
      new Types.ObjectId(collabId),
      emails,
    );
    return result;
  }

  @Post('send-to-all/:collabId')
  async sendEmailToAll(
    @Param('collabId') collabId: string,
    @Body('emails') emails: string[],
  ) {
    const result = await this.mailService.sendEmailToAll(
      new Types.ObjectId(collabId),
      emails,
    );
    return result;
  }
}
