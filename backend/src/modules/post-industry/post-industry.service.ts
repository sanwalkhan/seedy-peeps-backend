import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreatePostIndustryDto } from './create-post-industry.dto';
import { UpdatePostIndustryDto } from './update-post-industry.dto';
import { PostIndustry } from 'src/schemas/post-industry.schema';

@Injectable()
export class PostIndustryService {
  private readonly logger = new Logger(PostIndustryService.name);

  constructor(
    @InjectModel(PostIndustry.name)
    private readonly postIndustryModel: Model<PostIndustry>,
  ) {}

  async create(
    createPostIndustryDto: CreatePostIndustryDto,
  ): Promise<PostIndustry> {
    const createdPostIndustry = new this.postIndustryModel(
      createPostIndustryDto,
    );
    return createdPostIndustry.save();
  }

  async deleteByPostId(postId: string): Promise<void> {
    const postObjectId = new Types.ObjectId(postId);
    await this.postIndustryModel.deleteMany({ post: postObjectId }).exec();
  }

  async findAll(): Promise<PostIndustry[]> {
    return this.postIndustryModel.find().exec();
  }

  async findOne(id: string): Promise<PostIndustry> {
    const postIndustry = await this.postIndustryModel.findById(id).exec();
    if (!postIndustry) {
      throw new NotFoundException(`Post Industry with ID '${id}' not found`);
    }
    return postIndustry;
  }

  async updatePostIndustry(
    postId: string,
    industryId: string,
  ): Promise<PostIndustry> {
    try {
      const filter = { post: postId };
      const update = { industry: industryId };
      const options = { new: true, upsert: true };

      return await this.postIndustryModel
        .findOneAndUpdate(filter, update, options)
        .exec();
    } catch (error) {
      console.error('Failed to update post industry:', error);
      throw new BadRequestException('Failed to update post industry');
    }
  }

  async findByPostIds(postIds: Types.ObjectId[]): Promise<PostIndustry[]> {
    return this.postIndustryModel
      .find({ post: { $in: postIds } })
      .populate('industry', 'title')
      .exec();
  }

  async findByPostId(postId: string): Promise<PostIndustry | null> {
    return this.postIndustryModel.findOne({ post: postId }).exec();
  }
}
