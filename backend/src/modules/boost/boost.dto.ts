import { IsMongoId } from 'class-validator';

export class BoostPostDto {
  @IsMongoId()
  postId: string;
}
