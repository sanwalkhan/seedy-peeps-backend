import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Schema()
export class Seeds {
  @Prop()
  name: string;

  @Prop()
  quantity: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' }) // Reference to User model
  user: string;
}

export const SeedsSchema = SchemaFactory.createForClass(Seeds);
