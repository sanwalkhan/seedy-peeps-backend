import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Collab } from './space.schema';

@Schema({ timestamps: true, versionKey: false })
export class PastCollabParticipants extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'Collab', required: true })
  collab: Collab;

  @Prop({ type: Date, default: null })
  leftAt: Date;

  @Prop({ type: Date, default: null })
  removedAt: Date;

  @Prop({ type: String, enum: ['left', 'removed'], required: true })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  removedBy: User;
}

export const PastCollabParticipantsSchema = SchemaFactory.createForClass(
  PastCollabParticipants,
);
