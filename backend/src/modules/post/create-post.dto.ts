// src/dto/create-post.dto.ts
import { IsString, IsOptional, IsArray } from 'class-validator';

class AttachmentDto {
  @IsString()
  fileName: string;

  @IsString()
  type: 'image' | 'video';
}

export class CreatePostDto {
  @IsString()
  user: string;

  @IsArray()
  @IsString({ each: true })
  industry: string[];

  @IsString()
  @IsOptional()
  caption?: string;

  @IsArray()
  @IsOptional()
  attachments?: AttachmentDto[];
}
