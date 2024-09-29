import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailRecord } from 'src/schemas/email-record.schema';
import { AgendaService } from './agenda.service';
import { DeleteResult } from 'mongodb';

@Injectable()
export class EmailRecordService {
  constructor(
    @InjectModel('EmailRecord')
    private readonly emailRecordModel: Model<EmailRecord>,
    private readonly agendaService: AgendaService,
  ) {}

  async createEmailRecord(
    collabId: Types.ObjectId,
    email: string,
  ): Promise<EmailRecord> {
    const emailRecord = new this.emailRecordModel({
      collab: collabId,
      recipient: email,

      sent: false,
    });
    const savedRecord = await emailRecord.save();

    await this.agendaService.scheduleEmailExpiration(savedRecord._id);

    return savedRecord;
  }

  async updateEmailRecord(
    id: Types.ObjectId,
    sent: boolean,
  ): Promise<EmailRecord> {
    return this.emailRecordModel.findByIdAndUpdate(
      id,
      { sent: sent },
      { new: true },
    );
  }

  async findByCollabAndRecipient(
    collabId: Types.ObjectId,
    recipient: string,
  ): Promise<EmailRecord | null> {
    return this.emailRecordModel.findOne({ collab: collabId, recipient });
  }

  async getAllEmailRecordsByCollab(
    collabId: Types.ObjectId,
  ): Promise<EmailRecord[]> {
    return this.emailRecordModel.find({ collab: collabId }).exec();
  }

  async deleteEmailsRecords(
    collabId: Types.ObjectId,
    emails: string[],
  ): Promise<DeleteResult> {
    return this.emailRecordModel
      .deleteMany({
        collab: collabId,
        recipient: { $nin: emails },
      })
      .exec();
  }

  async deleteEmailRecordsByRecipientAndCollab(
    collabId: Types.ObjectId,
    email: string,
  ): Promise<DeleteResult> {
    return this.emailRecordModel
      .deleteMany({ collab: collabId, recipient: email })
      .exec();
  }
}
