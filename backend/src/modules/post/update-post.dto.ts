import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

class AttachmentDto {
  @IsString()
  fileName: string;

  @IsString()
  type: 'image' | 'video';
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  caption?: string;

  @IsArray()
  @IsOptional()
  attachments?: AttachmentDto[];

  @IsNotEmpty({ message: 'At least one industry must be provided.' })
  @IsString()
  readonly industry: string[];
}
