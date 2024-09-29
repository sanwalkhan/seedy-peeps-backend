import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { UserIndustryService } from './user-industry.service';
import { CreateUserIndustryDto } from './createuser-industry.dto';
import { UserIndustry } from 'src/schemas/user-industry.schema';

@Controller('user-industry')
export class UserIndustryController {
  constructor(private readonly userIndustryService: UserIndustryService) {}

  @Post()
  async createUserIndustries(
    @Body() createUserIndustryDto: CreateUserIndustryDto,
  ): Promise<string> {
    return this.userIndustryService.createUserIndustries(createUserIndustryDto);
  }

  @Get(':userId')
  async findAllUserIndustries(
    @Param('userId') userId: string,
  ): Promise<UserIndustry[]> {
    return this.userIndustryService.findUserIndustries(userId);
  }

  @Delete(':id')
  async deleteUserIndustry(
    @Param('id') id: string,
  ): Promise<UserIndustry | null> {
    return this.userIndustryService.deleteUserIndustry(id);
  }
}
