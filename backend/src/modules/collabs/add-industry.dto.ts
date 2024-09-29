import { IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class AddIndustryDto {
  @IsNotEmpty()
  readonly industryId: Types.ObjectId;
}
