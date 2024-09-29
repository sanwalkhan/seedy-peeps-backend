import { IsNotEmpty, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class CreatePostIndustryDto {
  @IsNotEmpty()
  @IsString()
  post: Types.ObjectId;

  @IsNotEmpty()
  @IsString()
  industry: Types.ObjectId;
}
