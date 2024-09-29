import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IFocusLevel, IFocusLevels } from 'types';

@Schema({ timestamps: true, versionKey: false })
export class User extends Document {
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  email: string;

  @Prop()
  country: string;

  @Prop()
  dob: Date;

  @Prop({ default: IFocusLevel.Neutral, enum: IFocusLevel })
  focusLevel: IFocusLevels;

  @Prop()
  professionalTitle: string;

  @Prop()
  profileImage: string;

  @Prop()
  boostScore: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
