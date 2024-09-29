import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IndustryTitle } from 'src/schemas/industry-type.schema';
import { CreateIndustryDto } from './create-industry.dto';
import { UpdateIndustryDto } from './update-industry.dto';

@Injectable()
export class IndustryService {
  constructor(
    @InjectModel(IndustryTitle.name)
    private industryModel: Model<IndustryTitle>,
  ) {}

  async create(createIndustryDto: CreateIndustryDto): Promise<IndustryTitle> {
    const createdIndustry = new this.industryModel(createIndustryDto);
    return createdIndustry.save();
  }

  async findAll(): Promise<IndustryTitle[]> {
    return this.industryModel.find().sort({ title: 1 }).exec();
  }

  async update(
    id: string,
    updateIndustryDto: UpdateIndustryDto,
  ): Promise<IndustryTitle> {
    const existingIndustry = await this.industryModel.findByIdAndUpdate(
      id,
      updateIndustryDto,
      { new: true },
    );
    if (!existingIndustry) {
      throw new NotFoundException(`Industry with ID '${id}' not found`);
    }
    return existingIndustry;
  }
}
