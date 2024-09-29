import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
  versionKey: false,
})
export class IndustryTitle extends Document {
  @Prop({ required: true })
  title: string;

  @Prop()
  comments: string;
}

export const IndustryTitleSchema = SchemaFactory.createForClass(IndustryTitle);
