import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Message } from './message.schema';
import { CollabIndustry } from './space-industry.schema';

enum Visibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

@Schema({ timestamps: true, versionKey: false })
export class Collab extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  bio: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: User;

  @Prop({ type: String, enum: Visibility, default: Visibility.PUBLIC })
  visibility: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  members: User[];

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessage: Message;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'CollabIndustry' }] })
  industry: CollabIndustry[];

  @Prop()
  avatar: string;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const CollabSchema = SchemaFactory.createForClass(Collab);
