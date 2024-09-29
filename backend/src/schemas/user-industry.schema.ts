import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IndustryTitle } from './industry-type.schema';
import { User } from './user.schema';

@Schema({ timestamps: true, versionKey: false })
export class UserIndustry extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'IndustryTitle', required: true })
  industry: IndustryTitle;
}

export const UserIndustrySchema = SchemaFactory.createForClass(UserIndustry);
