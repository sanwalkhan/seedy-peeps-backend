import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PredefinedProfileDocument = PredefinedProfile & Document;

@Schema()
export class PredefinedProfile {
  @Prop({ required: true })
  profile: string;
}

export const PredefinedProfileSchema =
  SchemaFactory.createForClass(PredefinedProfile);
