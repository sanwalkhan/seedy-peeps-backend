import mongoose, { Document } from 'mongoose';
import { IReactionType } from 'types';
export interface IStoryReaction extends Document {
  readonly story: mongoose.Types.ObjectId;
  readonly user: mongoose.Types.ObjectId;
  readonly reaction: IReactionType;
}
