import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { PredefinedProfileService } from './pre-definedProfile.service';

@Controller('predefined-profiles')
export class PredefinedProfileController {
  constructor(
    private readonly predefinedProfileService: PredefinedProfileService,
  ) {}

  @Post('upload')
  async uploadPredefinedProfileImage(
    @Body('base64Data') base64Data: string,
    @Body('fileName') fileName: string,
    @Body('mimeType') mimeType: string,
    @Res() response: Response,
  ) {
    try {
      if (!base64Data || !fileName || !mimeType) {
        throw new BadRequestException(
          'Missing base64 data, fileName, or mimeType',
        );
      }

      const newProfile =
        await this.predefinedProfileService.uploadPredefinedProfileImage(
          base64Data,
          fileName,
          mimeType,
        );
      return response.status(HttpStatus.CREATED).json(newProfile);
    } catch (error) {
      console.error(error);
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Failed to upload predefined profile image',
      });
    }
  }

  @Get()
  async findAll(@Res() response: Response) {
    try {
      const profiles = await this.predefinedProfileService.findAll();
      return response.status(HttpStatus.OK).json({
        profiles,
      });
    } catch (error) {
      console.error(error);
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: 500,
        message: 'Failed to retrieve predefined profiles',
      });
    }
  }
}
