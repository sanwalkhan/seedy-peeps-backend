import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Collab } from './space.schema';

@Schema({ timestamps: true, versionKey: false })
export class Membership extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'Collab', required: true })
  collab: Collab;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);
