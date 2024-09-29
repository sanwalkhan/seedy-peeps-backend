import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleSignInUserDto {
  @IsNotEmpty()
  @IsString()
  readonly token: string;
}
