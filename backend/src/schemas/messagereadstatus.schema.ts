import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Message } from './message.schema';
import { Collab } from './space.schema';

@Schema({ timestamps: true, versionKey: false })
export class MessageReadStatus extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true })
  message: Message;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'Collab', required: true })
  collab: Collab;

  @Prop({ type: Boolean, default: false })
  read: boolean;
}

export const MessageReadStatusSchema = SchemaFactory.createForClass(MessageReadStatus);
