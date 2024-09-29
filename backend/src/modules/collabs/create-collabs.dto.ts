import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Types } from 'mongoose';
import { ICreateCollab } from './collabs.interface';

enum Visibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export class CreateCollabDto implements ICreateCollab {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @IsOptional()
  readonly bio?: string;

  @IsNotEmpty()
  readonly owner: Types.ObjectId;

  @IsArray()
  @IsOptional()
  readonly members?: Types.ObjectId[];

  @IsArray()
  @IsOptional()
  readonly industries?: Types.ObjectId[];

  @IsString()
  @IsOptional()
  readonly avatar?: string;

  @IsEnum(Visibility)
  @IsOptional()
  readonly visibility?: 'public' | 'private';

  @IsArray()
  @IsOptional()
  emails?: string[];
}
