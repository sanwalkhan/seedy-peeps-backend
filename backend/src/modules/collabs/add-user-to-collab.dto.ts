import { IsNotEmpty, IsString } from 'class-validator';

export class AddUserToCollabDto {
  @IsNotEmpty()
  @IsString()
  userId: string;
}
