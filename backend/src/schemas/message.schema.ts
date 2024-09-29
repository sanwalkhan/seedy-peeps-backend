import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Collab } from './space.schema';

@Schema({ timestamps: true, versionKey: false })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'Collab', required: true })
  collab: Collab;

  @Prop()
  content: string;

  @Prop({
    type: [
      { fileName: String, type: { type: String, enum: ['image', 'video'] } },
    ],
  })
  attachments: {
    fileName: string;
    type: 'image' | 'video';
  }[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);
