import { Document } from 'mongoose';

export interface IUser extends Document {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly country: string;
  readonly dob: Date;
  readonly focusLevel: string;
  readonly professionalTitle: string;
  readonly profileImage: string;
  readonly boostScore: number;
  readonly expo_token: string;
}
