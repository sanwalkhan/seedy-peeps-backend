import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  Query,
  HttpException,
} from '@nestjs/common';
import { RegisterUserDto } from 'src/modules/user/register-user.dto';
import { UpdateUserDto } from 'src/modules/user/update-user.dto';
import { UserService } from './user.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageUploadService } from '../fileUpload/file-upload-service';
import { UpdateFocusLevelDto } from './update-focus-level.dto';
import { PostService } from '../post/post.service';
import { CollabService } from '../collabs/collabs.service';
import { UserIndustryService } from '../user-industry/user-industry.service';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly imageUploadService: ImageUploadService,
    private readonly postService: PostService,
    private readonly collabService: CollabService,
    private readonly userIndustryService: UserIndustryService,
  ) { }

  @Post('register')
  async registerUser(
    @Res() response,
    @Body() registerUserDto: RegisterUserDto,
  ) {
    try {
      const { newUser, userExists } =
        await this.userService.registerUser(registerUserDto);
      if (userExists)
        return response.status(HttpStatus.OK).json({
          statusCode: 403,
          message: 'User profile already created!',
          newUser,
        });
      else
        return response.status(HttpStatus.CREATED).json({
          statusCode: 200,
          message: 'User profile created successfully!',
          newUser,
        });
    } catch (error) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'Failed to create user profile!',
      });
    }
  }
  @Put('update')
  @UseInterceptors(FileInterceptor('profileImage'))
  async updateProfile(
    @Req() request,
    @Res() response,
    @UploadedFile() profileImage: Express.Multer.File,
    @Req() { body }: { body: UpdateUserDto & { industries?: string[] } },
  ) {
    try {
      const userId = request.user._id;

      let existingImageUrl = body.profileImage || null;

      // Handle profile image updates
      if (profileImage) {
        if (existingImageUrl) {
          await this.imageUploadService.deleteFile(existingImageUrl);
        }

        const s3Response =
          await this.imageUploadService.uploadFile(profileImage);
        existingImageUrl = s3Response.Location;
      }

      // Update user profile in the database
      const updatedUser = await this.userService.updateProfile(userId, {
        ...body,
        profileImage: existingImageUrl,
      });

      return response.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'User profile updated successfully!',
        user: updatedUser,
      });
    } catch (error) {
      console.error(error);
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'Failed to update user profile!',
      });
    }
  }
  @Get('whoami')
  async getUserById(@Req() request, @Res() response) {
    try {
      return response.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'User found successfully!',
        user: request.user,
      });
    } catch (error) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'Failed to get user profile!',
      });
    }
  }
  @Get('detail/:id')
  async getUserDetail(@Res() response, @Param('id') userId: string) {
    try {
      const user = await this.userService.getUserDetail(userId);
      return response.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'User found successfully!',
        user,
      });
    } catch (error) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'Failed to get user profile!',
      });
    }
  }

  @Put('focus-level')
  async updateFocusLevel(
    @Req() request,
    @Body() updateFocusLevelDto: UpdateFocusLevelDto,
    @Res() response,
  ) {
    try {
      const userId = request.user._id;
      const updatedUser = await this.userService.updateFocusLevel(
        userId,
        updateFocusLevelDto.focusLevel,
      );
      return response.status(HttpStatus.OK).json({
        statusCode: 200,
        user: updatedUser,
      });
    } catch (error) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'Failed to update focus level!',
      });
    }
  }

  @Get('search')
  async search(
    @Query('keyword') keyword: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('returnAllOnNoMatch') returnAllOnNoMatch: boolean = false,
    @Req() request,
  ) {
    try {
      const userId = request.user._id;
      const pageNum = parseInt(page as any, 10);
      const limitNum = parseInt(limit as any, 10);

      if (!keyword || keyword.trim() === '') {
        if (returnAllOnNoMatch) {
          const userResults = await this.userService.searchUsersByName(
            '',
            pageNum,
            limitNum,
            false,
          );

          return {
            users: userResults.users,
            userCount: userResults.count,
            collabs: [],
            collabCount: 0,
            totalResults: userResults.count,
            currentPage: pageNum,
            totalPages: Math.ceil(userResults.count / limitNum),
          };
        } else {
          return {
            users: [],
            userCount: 0,
            collabs: [],
            collabCount: 0,
            totalResults: 0,
            currentPage: pageNum,
            totalPages: 0,
          };
        }
      }

      // Search users and collabs with the provided keyword
      const userResults = await this.userService.searchUsersByName(
        keyword,
        pageNum,
        limitNum,
        returnAllOnNoMatch,
      );

      const collabResults = await this.collabService.searchCollabsByName(
        keyword,
        pageNum,
        limitNum,
        userId,
      );

      return {
        users: userResults.users,
        userCount: userResults.count,
        collabs: collabResults.collabs,
        collabCount: collabResults.count,
        totalResults: userResults.count + collabResults.count,
        currentPage: pageNum,
        totalPages: Math.ceil(
          (userResults.count + collabResults.count) / limitNum,
        ),
      };
    } catch (error) {
      throw new HttpException(
        'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  @Get('top-collaborators')
  async getTopCollaborators(@Res() response) {
    try {
      const topUsers = await this.userService.getTopCollaborators();
      return response.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'Top collaborators retrieved successfully',
        users: topUsers,
      });
    } catch (error) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Failed to retrieve top collaborators',
        error: error.message,
      });
    }
  }

  @Delete(':id')
  async deleteUser(@Res() response, @Param('id') userId: string) {
    try {
      await this.userService.deleteUser(userId);
      return response.status(HttpStatus.OK).json({
        statusCode: 200,
        message: 'User deleted successfully!',
      });
    } catch (error) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: 400,
        message: 'Failed to delete user!',
      });
    }
  }
}
