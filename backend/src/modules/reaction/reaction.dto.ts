import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class ToggleReactionDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsMongoId()
  @IsNotEmpty()
  postId: string;

  @IsString()
  @IsNotEmpty()
  emoji: string;

  @IsString()
  @IsNotEmpty()
  emojiName: string;
}
