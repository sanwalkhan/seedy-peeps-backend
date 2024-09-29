import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
} from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  readonly firstName: string;

  @IsString()
  @IsNotEmpty()
  readonly lastName: string;

  @IsEmail()
  @IsNotEmpty()
  readonly email: string;

  @IsString()
  @IsOptional()
  readonly country?: string;

  @IsDateString()
  @IsOptional()
  readonly dob?: Date;

  @IsString()
  @IsOptional()
  readonly focusLevel?: string;

  @IsString()
  @IsOptional()
  readonly professionalTitle?: string;

  @IsString()
  @IsOptional()
  profileImage?: string;

  @IsNumber()
  @IsOptional()
  readonly boostScore?: number;

  @IsOptional()
  @IsString({ each: true })
  readonly industries?: string[];
}
