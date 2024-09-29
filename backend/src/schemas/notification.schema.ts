import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: String })
  clickUrl: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: mongoose.Types.ObjectId;

  @Prop({
    type: {
      _id: mongoose.Schema.Types.ObjectId,
      firstName: String,
      lastName: String,
      profileImage: String,
    },
    required: true,
  })
  actingUser: {
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    profileImage: string;
  };

  @Prop({
    type: {
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      avatar: String,
    },
  })
  collab?: {
    _id: mongoose.Types.ObjectId;
    name: string;
    avatar?: string;
  };
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
