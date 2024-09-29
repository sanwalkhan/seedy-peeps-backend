import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GoogleAuthController } from './modules/google-auth/google-auth.controller';
import { GoogleAuthService } from './modules/google-auth/google-auth.service';
import { UserSchema } from './schemas/user.schema';
import { UserController } from './modules/user/user.controller';
import { UserService } from './modules/user/user.service';
import { ReactionSchema } from './schemas/reaction.schema';
import { ReactionController } from './modules/reaction/reaction.controller';
import { ReactionService } from './modules/reaction/reaction.service';
import { VerifyAuthentication } from './middleware/auth.middleware';
import { NotificationsController } from './modules/notifications/notifications.controller';
import { NotificationsService } from './modules/notifications/notifications.service';
import { CollabService } from './modules/collabs/collabs.service';
import { CollabsController } from './modules/collabs/collabs.controller';
import { CollabGateway } from './sockets/collab.gateway';
import { NotificationGateway } from './sockets/notification.gateway';
import { IndustryTitleSchema } from './schemas/industry-type.schema';
import { IndustryService } from './modules/industry/industry-Service';
import { IndustryController } from './modules/industry/industry-controller';
import { UserIndustrySchema } from './schemas/user-industry.schema';
import { UserIndustryController } from './modules/user-industry/user-industry.controller';
import { UserIndustryService } from './modules/user-industry/user-industry.service';
import { CountriesService } from './modules/country/countries.service';
import { CountriesController } from './modules/country/countries.controller';
import { PredefinedProfileController } from './modules/pre-definedProfiles/pre-definedProfile.controller';
import { PredefinedProfileService } from './modules/pre-definedProfiles/pre-definedProfile.service';
import {
  PredefinedProfile,
  PredefinedProfileSchema,
} from './schemas/predefined-profiles.schema';
import { PostService } from './modules/post/post.service';
import { PostController } from './modules/post/post.controller';
import { Post, PostSchema } from './schemas/post.schema';
import { PostIndustryService } from './modules/post-industry/post-industry.service';
import { PostIndustrySchema } from './schemas/post-industry.schema';
import { BoostController } from './modules/boost/boost.controller';
import { BoostService } from './modules/boost/boost.service';
import { Boost, BoostSchema } from './schemas/boost.schema';
import { ImageUploadService } from './modules/fileUpload/file-upload-service';
import { Collab, CollabSchema } from './schemas/space.schema';
import {
  CollabIndustry,
  CollabIndustrySchema,
} from './schemas/space-industry.schema';
import { Membership, MembershipSchema } from './schemas/space-members.schema';
import { MessageService } from './modules/message/message.service';
import { MessageController } from './modules/message/message.controller';
import { MessageSchema } from './schemas/message.schema';
import { NotificationSchema } from './schemas/notification.schema';
import { MessageReadStatusSchema } from './schemas/messagereadstatus.schema';
import { MailService } from './modules/mail/mail.service';
import { EmailRecordSchema } from './schemas/email-record.schema';
import { EmailRecordService } from './modules/mail/email-record.service';
import { AgendaService } from './modules/mail/agenda.service';
import {
  PastCollabParticipants,
  PastCollabParticipantsSchema,
} from './schemas/past-collab-participants.schema';
import { MailController } from './modules/mail/mail.controller';
import { FileUploadController } from './modules/file-upload/file-upload.controller';
import { FileUploadService } from './modules/file-upload/file-upload.service';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb+srv://shoaibahmed47564:ddOQrUK3PTFK2gyi@cluster0.0gle7rj.mongodb.net/',
    ),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    MongooseModule.forFeature([{ name: 'Reaction', schema: ReactionSchema }]),
    MongooseModule.forFeature([
      { name: 'IndustryTitle', schema: IndustryTitleSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'UserIndustry', schema: UserIndustrySchema },
    ]),

    MongooseModule.forFeature([
      { name: PredefinedProfile.name, schema: PredefinedProfileSchema },
    ]),
    MongooseModule.forFeature([{ name: Post.name, schema: PostSchema }]),
    MongooseModule.forFeature([
      { name: 'PostIndustry', schema: PostIndustrySchema },
    ]),
    MongooseModule.forFeature([{ name: Boost.name, schema: BoostSchema }]),
    MongooseModule.forFeature([{ name: Collab.name, schema: CollabSchema }]),
    MongooseModule.forFeature([
      { name: CollabIndustry.name, schema: CollabIndustrySchema },
    ]),
    MongooseModule.forFeature([
      { name: Membership.name, schema: MembershipSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'Message', schema: MessageSchema },
      { name: 'MessageReadStatus', schema: MessageReadStatusSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'Notification', schema: NotificationSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'EmailRecord', schema: EmailRecordSchema },
    ]),
    MongooseModule.forFeature([
      {
        name: PastCollabParticipants.name,
        schema: PastCollabParticipantsSchema,
      },
    ]),
  ],

  controllers: [
    AppController,
    UserController,
    GoogleAuthController,
    ReactionController,
    NotificationsController,
    CollabsController,
    IndustryController,
    UserIndustryController,
    CountriesController,
    PredefinedProfileController,
    PostController,
    ReactionController,
    BoostController,
    MessageController,
    MailController,
    FileUploadController,
  ],
  providers: [
    AppService,
    UserService,
    GoogleAuthService,
    ReactionService,
    NotificationsService,
    CollabService,
    CollabGateway,
    IndustryService,
    UserIndustryService,
    CountriesService,
    ImageUploadService,
    PredefinedProfileService,
    PostService,
    PostIndustryService,
    ReactionService,
    BoostService,
    MessageService,
    NotificationGateway,
    MailService,
    EmailRecordService,
    AgendaService,
    FileUploadService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(VerifyAuthentication)
      .exclude(
        { path: 'google-auth/sign-in', method: RequestMethod.POST },
        { path: 'google-auth/logout', method: RequestMethod.POST },
        { path: 'user/register', method: RequestMethod.POST },
        { path: 'industry', method: RequestMethod.GET },
        { path: 'industry', method: RequestMethod.POST },
      )
      .forRoutes(
        'user',
        'stories',
        'seeds',
        'reaction',
        'notifications',
        'collabs',
        'industry',
        'search',
        'boost',
        'reactions',
        'posts',
        'messages',
        'mail',
      );
  }
}
