// interfaces/create-collab.interface.ts
import { Types } from 'mongoose';

export interface ICreateCollab {
  readonly name: string;
  readonly bio?: string;
  readonly owner: Types.ObjectId;
  readonly members?: Types.ObjectId[];
  readonly industries?: Types.ObjectId[];
  readonly avatar?: string;
  readonly visibility?: 'public' | 'private';
}
