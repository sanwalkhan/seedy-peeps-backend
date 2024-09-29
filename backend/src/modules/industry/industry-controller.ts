import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { IndustryService } from './industry-Service';
import { CreateIndustryDto } from './create-industry.dto';
import { IndustryTitle } from 'src/schemas/industry-type.schema';
import { UpdateIndustryDto } from './update-industry.dto';

@Controller('industry')
export class IndustryController {
  constructor(private readonly industryService: IndustryService) {}

  @Post()
  async create(
    @Body() createIndustryDto: CreateIndustryDto,
  ): Promise<IndustryTitle> {
    return this.industryService.create(createIndustryDto);
  }

  @Get()
  async findAll(): Promise<IndustryTitle[]> {
    return this.industryService.findAll();
  }


  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateIndustryDto: UpdateIndustryDto): Promise<IndustryTitle> {
    return this.industryService.update(id, updateIndustryDto);
  }


}
