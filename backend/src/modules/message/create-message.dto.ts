import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

class AttachmentDto {
  @IsString()
  fileName: string;

  @IsString()
  type: 'image' | 'video';
}

export class CreateMessageDto {
  @IsNotEmpty()
  readonly collabId: string;

  @IsNotEmpty()
  @IsString()
  readonly content: string;

  @IsArray()
  @IsOptional()
  attachments?: AttachmentDto[];
}
