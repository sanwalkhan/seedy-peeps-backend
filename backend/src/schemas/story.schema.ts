import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { IStoryType, IStoryTypes } from 'types';

@Schema({ timestamps: true })
export class Story extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }) // Reference to User model
  user: string;

  @Prop({ default: '' })
  postText: string;

  @Prop({ type: [String], default: [] })
  postImages: string[];

  @Prop({ type: String, default: 'none' })
  seed: string;

  @Prop({ default: 0 })
  totalLikes: number;

  @Prop({ default: 0 })
  totalDislikes: number;

  @Prop({ default: 0 })
  delta: number;

  @Prop({ enum: IStoryTypes, default: 'text' })
  storyType: IStoryType;
}

export const StorySchema = SchemaFactory.createForClass(Story);
