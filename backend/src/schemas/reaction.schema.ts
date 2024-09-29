import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Post } from './post.schema';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Reaction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  post: Types.ObjectId;

  @Prop({ required: true })
  emoji: string;

  @Prop({ required: true })
  emojiName: string;
}

export const ReactionSchema = SchemaFactory.createForClass(Reaction);
