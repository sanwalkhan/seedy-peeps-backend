// update-post-industry.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdatePostIndustryDto {
  @IsNotEmpty()
  @IsString()
  readonly industry: string;
}
