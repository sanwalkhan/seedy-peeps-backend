import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

enum Visibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export class UpdateCollabDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsEnum(Visibility)
  @IsOptional()
  visibility?: Visibility;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsArray()
  @IsOptional()
  industries?: string[];

  @IsArray()
  @IsOptional()
  members?: string[];

  @IsArray()
  @IsOptional()
  emails?: string[];
}
