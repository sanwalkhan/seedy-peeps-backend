// boost.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Post } from './post.schema';

@Schema({ timestamps: true, versionKey: false })
export class Boost extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true, unique: true })
  post: Post;
}

export const BoostSchema = SchemaFactory.createForClass(Boost);
