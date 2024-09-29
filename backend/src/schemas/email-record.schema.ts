import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class EmailRecord extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Collab', required: true })
  collab: Types.ObjectId;

  @Prop({ type: String, required: true })
  recipient: string;

  @Prop({ type: Boolean, default: false })
  sent: boolean;

  @Prop({ type: Boolean, default: false })
  expired: boolean;

  @Prop({ type: Boolean, default: false })
  joined: boolean;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const EmailRecordSchema = SchemaFactory.createForClass(EmailRecord);
