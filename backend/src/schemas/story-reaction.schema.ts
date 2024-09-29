import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { IReactionType } from 'types';
@Schema()
export class StoryReaction extends Document {
  @Prop({ required: true })
  reaction: IReactionType;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true,
  })
  story: string;
}

export const StoryReactionSchema = SchemaFactory.createForClass(StoryReaction);
