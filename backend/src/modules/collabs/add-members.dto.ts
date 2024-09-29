import { IsArray, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class AddMembersDto {
  @IsArray()
  @IsNotEmpty()
  readonly userIds: Types.ObjectId[];
}
