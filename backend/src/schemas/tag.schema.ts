import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Message } from './message.schema';
import { Post } from './post.schema';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Tag extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  message?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Post' })
  post?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Space' })
  space?: Types.ObjectId;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
