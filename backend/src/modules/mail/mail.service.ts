import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmailRecordService } from './email-record.service';
import { User } from 'src/schemas/user.schema';
import { Collab } from 'src/schemas/space.schema';
import { EmailRecord } from 'src/schemas/email-record.schema';

@Injectable()
export class MailService {
  private transporter;

  constructor(
    private readonly emailRecordService: EmailRecordService,
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('Collab') private readonly collabModel: Model<Collab>,
    @InjectModel(EmailRecord.name)
    private readonly emailRecordModel: Model<EmailRecord>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'sanwal.khan@myproappz.com',
        pass: 'avly xxna uwet jasq',
      },
    });
  }

  private getHtmlContent(
    ownerFirstName: string,
    ownerLastName: string,
    collabName: string,
    collabId: Types.ObjectId,
  ): string {
    const baseUrl = 'https://seedy-peeps-app-development.up.railway.app';
    return `
      <html>
      <body>
        <div style="text-align: center;">
          <a href="${baseUrl}" target="_blank">
            <img src="cid:seedyPeepsLogo" alt="SeedyPeeps" width="180" height="105"/>
          </a>
        </div>
        <h2>You're Invited to Collaborate!</h2>
        <p>Dear User,</p>
        <p>${ownerFirstName} ${ownerLastName} has invited you to join an exciting collaboration on Seedy Peeps titled "${collabName}". We believe your insights and ideas would greatly contribute, and we're eager to see what we can create together!</p>
        <p>To get started, simply click the button below to access the collaboration:</p>
        <p>
          <a href="${baseUrl}?invitedId=${collabId}" style="background-color: #DC5F00; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Join the Collab</a>
        </p>  
        <p>If the button does not work, you can also access the collaboration using the following link:</p>
        <p><a style="color:  #DC5F00;" href="${baseUrl}?invitedId=${collabId}">${baseUrl}?invitedId=${collabId}</a></p>
        <p>We’re excited about the possibilities this collaboration holds and can’t wait to see your creative ideas in action. Please don't hesitate to share your thoughts, suggestions, and any unique ideas you may have.</p>
        <p>Looking forward to your participation!</p>
        <p>Best regards,<br>The Seedy Peeps Team</p>
      </body>
      </html>
    `;
  }

  async sendEmail(
    collabId: Types.ObjectId,
    emails: string[],
  ): Promise<{ message: string; details: any[] }> {
    try {
      const collab = await this.collabModel
        .findById(collabId)
        .populate('owner')
        .exec();

      if (!collab) {
        throw new Error('Collab not found');
      }

      const { owner, name: collabName } = collab;
      const { firstName: ownerFirstName, lastName: ownerLastName } = owner;

      const registeredUsers = await this.userModel
        .find({ email: { $in: emails } })
        .exec();
      const registeredEmails = registeredUsers.map((user) => user.email);

      const nonRegisteredEmails = emails.filter(
        (email) =>
          !registeredEmails.includes(email) &&
          !collab.members.some((member) => member.email === email),
      );

      // Delete existing records for the collabId and emails
      await Promise.all(
        emails.map((email) =>
          this.emailRecordService.deleteEmailRecordsByRecipientAndCollab(
            collabId,
            email,
          ),
        ),
      );

      const emailPromises = nonRegisteredEmails.map(async (recipient) => {
        try {
          const mailOptions = {
            from: 'noreply@myproappz.com',
            to: recipient,
            subject: `Invitation to Join ${collabName} Collaboration`,
            html: this.getHtmlContent(
              ownerFirstName,
              ownerLastName,
              collabName,
              collabId,
            ),
            attachments: [
              {
                filename: 'logo.png',
                path: 'https://seedypeeps.s3.ap-south-1.amazonaws.com/logoww-10.png',
                cid: 'seedyPeepsLogo',
              },
            ],
          };

          await this.transporter.sendMail(mailOptions);
          console.log(`Invitation email sent to ${recipient}`);

          await this.emailRecordService.createEmailRecord(collabId, recipient);

          return { recipient, status: 'sent' };
        } catch (error) {
          console.error(
            `Error sending invitation email to ${recipient}:`,
            error.message,
          );
          return { recipient, status: 'failed', error: error.message };
        }
      });

      const results = await Promise.all(emailPromises);

      const failedEmails = results.filter(
        (result) => result.status === 'failed',
      );

      if (failedEmails.length > 0) {
        throw new Error(
          `Failed to send emails to the following recipients: ${failedEmails
            .map((email) => email.recipient)
            .join(', ')}`,
        );
      }

      return {
        message: 'Invitation emails processed successfully.',
        details: results,
      };
    } catch (error) {
      console.error('Error processing invitation emails:', error.message);
      return {
        message: 'Error processing invitation emails.',
        details: [],
      };
    }
  }

  async sendEmailToAll(
    collabId: Types.ObjectId,
    emails: string[],
  ): Promise<{ message: string; details: any[] }> {
    try {
      // Fetch the collab and owner details
      const collab = await this.collabModel
        .findById(collabId)
        .populate('owner')
        .exec();

      if (!collab) {
        throw new Error('Collab not found');
      }

      const { owner, name: collabName } = collab;
      const { firstName: ownerFirstName, lastName: ownerLastName } = owner;

      // Fetch registered users based on the provided emails
      const registeredUsers = await this.userModel
        .find({ email: { $in: emails } })
        .exec();
      const registeredEmails = registeredUsers.map((user) => user.email);

      // Filter out emails already registered and members' emails
      const emailsToSend = emails.filter(
        (email) =>
          !registeredEmails.includes(email) &&
          !collab.members.some((member) => member.email === email),
      );

      // Fetch all existing email records for this collab and recipient emails
      const existingEmailRecords = await this.emailRecordModel.find({
        collab: collabId,
        recipient: { $in: emailsToSend },
      });

      // Separate expired and non-expired email records
      const nonExpiredEmails = existingEmailRecords
        .filter((record) => !record.expired)
        .map((record) => record.recipient);

      const expiredEmails = existingEmailRecords
        .filter((record) => record.expired)
        .map((record) => record.recipient);

      // Final list of emails to send: not non-expired (new ones or expired)
      const finalEmailsToSend = emailsToSend.filter(
        (email) =>
          expiredEmails.includes(email) || !nonExpiredEmails.includes(email),
      );

      // Delete email records that are not in the new request
      await this.emailRecordModel.deleteMany({
        collab: collabId,
        recipient: { $nin: emails }, // Emails not in the new request
      });

      if (finalEmailsToSend.length === 0) {
        return {
          message: 'No new or non-expired emails to send.',
          details: [],
        };
      }

      // Prepare email sending promises
      const emailPromises = finalEmailsToSend.map(async (recipient) => {
        try {
          const mailOptions = {
            from: 'noreply@myproappz.com',
            to: recipient,
            subject: `Invitation to Join ${collabName} Collaboration`,
            html: this.getHtmlContent(
              ownerFirstName,
              ownerLastName,
              collabName,
              collabId,
            ),
            attachments: [
              {
                filename: 'logo.png',
                path: 'https://seedypeeps.s3.ap-south-1.amazonaws.com/logoww-10.png',
                cid: 'seedyPeepsLogo',
              },
            ],
          };

          // Send email via transporter
          await this.transporter.sendMail(mailOptions);
          console.log(`Invitation email sent to ${recipient}`);

          // Mark email record as sent, create new record if it doesn't exist
          await this.emailRecordService.createEmailRecord(collabId, recipient);

          return { recipient, status: 'sent' };
        } catch (error) {
          console.error(
            `Error sending invitation email to ${recipient}:`,
            error.message,
          );
          return { recipient, status: 'failed', error: error.message };
        }
      });

      // Await all email sending promises
      const results = await Promise.all(emailPromises);

      // Check for any failures
      const failedEmails = results.filter(
        (result) => result.status === 'failed',
      );

      if (failedEmails.length > 0) {
        throw new Error(
          `Failed to send emails to the following recipients: ${failedEmails
            .map((email) => email.recipient)
            .join(', ')}`,
        );
      }

      return {
        message: 'Invitation emails processed successfully.',
        details: results,
      };
    } catch (error) {
      console.error('Error processing invitation emails:', error.message);
      return {
        message: 'Error processing invitation emails.',
        details: [],
      };
    }
  }
}
