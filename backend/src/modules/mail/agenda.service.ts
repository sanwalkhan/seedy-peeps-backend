import { Injectable, OnModuleInit } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import Agenda from 'agenda';
import { EmailRecord } from '../../schemas/email-record.schema';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class AgendaService implements OnModuleInit {
  private agenda: Agenda;

  constructor(
    @InjectModel('EmailRecord')
    private readonly emailRecordModel: Model<EmailRecord>,
  ) {
    this.agenda = new Agenda({
      db: {
        address:
          'mongodb+srv://shoaibahmed47564:ddOQrUK3PTFK2gyi@cluster0.0gle7rj.mongodb.net/',
      },
    });
  }

  async onModuleInit() {
    this.defineJobs();
    await this.startAgenda();
  }

  private defineJobs() {
    this.agenda.define('expire old email records', async (job, done) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const result = await this.emailRecordModel.updateMany(
        { createdAt: { $lte: oneHourAgo }, expired: false },
        { expired: true },
      );
      console.log(`Documents matched: ${result.matchedCount}`);
      console.log(`Documents modified: ${result.modifiedCount}`);
      done();
    });

    this.agenda.define('expire specific email record', async (job, done) => {
      const { emailRecordId } = job.attrs.data as {
        emailRecordId: Types.ObjectId;
      };
      if (!emailRecordId) {
        console.error('No emailRecordId found in job data.');
        done();
        return;
      }
      await this.emailRecordModel.findByIdAndUpdate(emailRecordId, {
        expired: true,
      });
      done();
    });
  }

  private async startAgenda() {
    await this.agenda.start();

    await this.agenda.every('1 hour', 'expire old email records');
  }

  async scheduleEmailExpiration(emailRecordId: Types.ObjectId) {
    await this.agenda.schedule('in 1 hour', 'expire specific email record', {
      emailRecordId,
    });
  }
}
