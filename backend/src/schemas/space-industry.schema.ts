import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IndustryTitle } from './industry-type.schema';

@Schema({ timestamps: true, versionKey: false })
export class CollabIndustry extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Collab', required: true })
  collab: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'IndustryTitle', required: true })
  industry: IndustryTitle;
}

export const CollabIndustrySchema =
  SchemaFactory.createForClass(CollabIndustry);
