import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpStatus,
  HttpCode,
  Param,
  Put,
  Get,
  Delete,
  BadRequestException,
  HttpException,
  Patch,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { CollabService } from './collabs.service';
import { CreateCollabDto } from './create-collabs.dto';
import { UpdateCollabDto } from './update-collab.dto';
import { Types } from 'mongoose';
import { Collab } from 'src/schemas/space.schema';
import { AddUserToCollabDto } from './add-user-to-collab.dto';

@Controller('collabs')
export class CollabsController {
  constructor(private readonly collabService: CollabService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCollab(@Body() createCollabDto: CreateCollabDto, @Req() request) {
    const ownerId = request.user._id;
    const createdCollab = await this.collabService.createCollab(
      createCollabDto,
      ownerId,
    );
    return createdCollab;
  }
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async updateCollab(
    @Param('id') collabId: string,
    @Body() updateCollabDto: UpdateCollabDto,
    @Req() req,
  ): Promise<Collab> {
    const userId = req.user._id.toString();
    return this.collabService.updateCollab(userId, collabId, updateCollabDto);
  }

  @Get('top')
  async getTopCollabs(@Req() req) {
    const loggedInUserId = req.user._id;
    return this.collabService.getTopCollabs(loggedInUserId);
  }

  @Get()
  async getAllCollabs(@Req() req): Promise<Collab[]> {
    const loggedInUserId = req.user._id;
    return this.collabService.getAllCollabs(loggedInUserId);
  }

  @Get('user')
  async getUserCollabs(@Req() request): Promise<Collab[]> {
    const userId = request.user._id;
    const userObjectId = new Types.ObjectId(userId);
    return this.collabService.getUserCollabs(userObjectId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteCollab(
    @Param('id') collabId: string,
    @Req() req,
  ): Promise<{ message: string; collab: any }> {
    const userId = req.user._id.toString();
    const updatedCollab = await this.collabService.deleteCollab(
      userId,
      collabId,
    );
    return {
      message: 'Collab marked as deleted successfully',
      collab: updatedCollab,
    };
  }

  @Post(':collabId/addUser')
  async addUserToCollab(
    @Param('collabId') collabId: string,
    @Body() addUserToCollabDto: AddUserToCollabDto,
  ) {
    return this.collabService.addUserToPublicCollab(
      collabId,
      addUserToCollabDto.userId,
    );
  }

  @Get(':collabId')
  async getCollabById(
    @Param('collabId') collabId: string,
    @Req() req,
  ): Promise<Collab | null> {
    const loggedInUserId = req.user._id;

    return this.collabService.getCollabById(collabId, loggedInUserId);
  }

  @Post(':collabId/join')
  async joinCollab(
    @Req() req,
    @Param('collabId') collabId: string,
  ): Promise<any> {
    const userId = req.user._id; // Extract userId from the token
    const email = req.user.email; // Extract email from the token

    if (!collabId) {
      throw new BadRequestException('Collab ID is required');
    }

    try {
      const result = await this.collabService.joinInvitedMember(
        userId,
        email,
        collabId,
      );
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      } else if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException(error.message);
      } else {
        throw new BadRequestException(error.message);
      }
    }
  }

  @Post(':collabId/leave')
  async leaveCollab(@Req() req, @Param('collabId') collabId: string) {
    const userId = req.user._id;
    const res = await this.collabService.leaveCollab(userId, collabId);
    return res;
  }
}
