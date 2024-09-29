import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserIndustry } from 'src/schemas/user-industry.schema';
import { CreateUserIndustryDto } from './createuser-industry.dto';

@Injectable()
export class UserIndustryService {
  constructor(
    @InjectModel(UserIndustry.name)
    private userIndustryModel: Model<UserIndustry>,
  ) {}

  async createUserIndustries(
    createUserIndustryDto: CreateUserIndustryDto,
  ): Promise<string> {
    const { userId, industries } = createUserIndustryDto;

    if (!Array.isArray(industries) || industries.length === 0) {
      throw new BadRequestException('Industries must be a non-empty array');
    }

    const userObjectId = new Types.ObjectId(userId);

    const userIndustries = industries.map((industry) => ({
      user: userObjectId,
      industry: new Types.ObjectId(industry),
    }));

    await this.userIndustryModel.insertMany(userIndustries);

    return `Industries added successfully`;
  }
  async findUserIndustries(userId: string): Promise<UserIndustry[]> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      const userIndustries = await this.userIndustryModel
        .find({ user: userObjectId })
        .populate('industry', 'title')
        .exec();

      return userIndustries;
    } catch (error) {
      console.error('Error finding all user industries:', error);
      return [];
    }
  }

  async updateUserIndustries(
    userId: string,
    industries: string[],
  ): Promise<void> {
    if (!Array.isArray(industries) || industries.length === 0) {
      throw new BadRequestException('Industries must be a non-empty array');
    }

    const userObjectId = new Types.ObjectId(userId);

    const currentIndustries = await this.userIndustryModel
      .find({ user: userObjectId })
      .select('industry')
      .exec();

    const currentIndustryIds = currentIndustries.map((industry) =>
      industry.industry.toString(),
    );

    const industriesToAdd = industries.filter(
      (industry) => !currentIndustryIds.includes(industry.toString()),
    );

    const industriesToRemove = currentIndustries.filter(
      (industry) => !industries.includes(industry.industry.toString()),
    );

    if (industriesToRemove.length > 0) {
      await Promise.all(
        industriesToRemove.map(async (industry) => {
          await this.userIndustryModel.findByIdAndDelete(industry._id).exec();
        }),
      );
    }

    const userIndustriesToAdd = industriesToAdd.map((industry) => ({
      user: userObjectId,
      industry: new Types.ObjectId(industry),
    }));

    await this.userIndustryModel.insertMany(userIndustriesToAdd);
  }

  async deleteUserIndustry(
    userIndustryId: string,
  ): Promise<UserIndustry | null> {
    return this.userIndustryModel.findByIdAndDelete(userIndustryId).exec();
  }
}
