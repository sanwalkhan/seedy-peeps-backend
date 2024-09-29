// post.controller.ts
import {
  Controller,
  Put,
  Param,
  Post,
  Body,
  Get,
  NotFoundException,
  HttpException,
  HttpStatus,
  Delete,
  Query,
  Req,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { PostService } from './post.service';
import { UpdatePostDto } from './update-post.dto';
import { Post as PostModel } from 'src/schemas/post.schema';
import { CreatePostDto } from './create-post.dto';
import { PaginationQueryDto } from './pagination-query.dto';
import { Types } from 'mongoose';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  async createPost(@Body() createPostDto: CreatePostDto, @Req() req) {
    const user = req.user;
    try {
      const newPost = await this.postService.create(createPostDto, user);
      console.log('new posts', newPost);
      return newPost;
    } catch (error) {
      throw new HttpException(
        'Failed to create post',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updatePost(
    @Param('id') postId: string,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostModel> {
    try {
      const updatedPost = await this.postService.updatePost(
        postId,
        updatePostDto,
      );
      if (!updatedPost) {
        throw new NotFoundException(`Post with ID ${postId} not found`);
      }
      return updatedPost;
    } catch (error) {
      throw new Error('Failed to update post');
    }
  }

  @Get('user-posts')
  async getUserPosts(
    @Req() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    try {
      // Convert userId to ObjectId

      const userId = req.user._id;

      const userObjectId = new Types.ObjectId(userId);

      // Call service method with pagination parameters
      const posts = await this.postService.findAllUserPostsWithDetails(
        userObjectId,
        page,
        limit,
      );

      return posts;
    } catch (error) {
      console.error('Failed to fetch user posts:', error);
      throw new Error('Failed to fetch user posts');
    }
  }

  @Get('user-posts/:userId')
  async findUserPostsWithDetails(
    @Req() req,
    @Param('userId') userId: string,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    try {
      const tokenUserId = req.user._id;
      const targetUserId = new Types.ObjectId(userId);
      const { page, limit } = paginationQuery;

      return await this.postService.findUserPostsWithDetails(
        targetUserId,
        tokenUserId,
        page,
        limit,
      );
    } catch (error) {
      console.error('Failed to fetch user posts with details:', error);
      throw new BadRequestException('Failed to fetch user posts with details');
    }
  }

  @Get('trending-posts')
  async getTrendingPosts(@Req() request): Promise<any[]> {
    const userId = request.user._id;

    try {
      const result = await this.postService.trendingPosts(userId);
      return result;
    } catch (error) {
      console.error('Failed to fetch trending posts:', error);
      throw new Error('Failed to fetch trending posts');
    }
  }

  @Get('top-posts/:userId')
  async getUserTrendingPosts(@Res() response, @Param('userId') userId: string) {
    try {
      const userObjectId = new Types.ObjectId(userId);

      const trendingPosts =
        await this.postService.trendingUserPosts(userObjectId);

      return response.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'Top 5 trending posts fetched successfully!',
        trendingPosts,
      });
    } catch (error) {
      console.error('Failed to fetch trending posts:', error);
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Failed to fetch trending posts!',
      });
    }
  }

  @Delete(':postId')
  async deletePost(@Param('postId') postId: string) {
    return this.postService.deletePost(postId);
  }

  @Get('filter')
  async filterPosts(
    @Req() request,
    @Query('focusLevel') focusLevel: string,
    @Query('boostScore') boostScore: string,
    @Query('industry') industry: string[],
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    const userId = request.user?._id;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    if (!page || !limit) {
      throw new BadRequestException(
        'Page and limit are required for pagination',
      );
    }

    return this.postService.filterPosts(
      new Types.ObjectId(userId),
      focusLevel,
      boostScore,
      industry,
      page,
      limit,
    );
  }

  @Get(':id')
  async findSinglePostWithDetails(
    @Param('id') id: string,
    @Req() req,
  ): Promise<any> {
    const userId = new Types.ObjectId(req.user._id);
    const postId = new Types.ObjectId(id);
    return this.postService.findSinglePostWithDetails(postId, userId);
  }
}
