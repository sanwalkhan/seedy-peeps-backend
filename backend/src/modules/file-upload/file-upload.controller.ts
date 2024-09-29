import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';

@Controller('file-upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('direct-upload')
  @UseInterceptors(FileInterceptor('file')) //helps handle file uploads from HTTP requests.
  async directUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body('fileName') fileName: string,
  ) {
    try {
      const uploadResult = await this.fileUploadService.uploadSingleFile(
        file.buffer, // file's data,
        fileName,
      );
      return { success: true, data: uploadResult.Location }; // returns the uploaded file's location.
    } catch (error) {
      throw new BadRequestException('Error uploading file');
    }
  }

  @Post('initiate-upload')
  async initiateUpload(@Body('fileName') fileName: string) {
    try {
      const uploadId = await this.fileUploadService.initiateUpload(fileName);
      return { uploadId };
    } catch (error) {
      console.error('Error initializing upload:', error);
      throw new BadRequestException('Error initializing upload');
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('index') index: number,
    @Body('fileName') fileName: string,
    @Query('uploadId') uploadId: string,
  ) {
    if (!file) {
      console.log('File is required');
      throw new BadRequestException('File is required');
    }

    try {
      const uploadResult = await this.fileUploadService.uploadPart(
        file.buffer,
        uploadId,
        fileName,
        index, //Represents which part (chunk) is being uploaded
      );
      console.log(uploadResult);
      return { success: true, message: 'Chunk uploaded successfully' };
    } catch (error) {
      console.error('Error uploading file chunk:', error);
      throw new BadRequestException('Error uploading chunk');
    }
  }

  @Post('complete-upload')
  async completeUpload(
    @Query('fileName') fileName: string,
    @Query('uploadId') uploadId: string,
  ) {
    try {
      const result = await this.fileUploadService.completeUpload(
        fileName,
        uploadId,
      );
      return {
        success: true,
        message: 'Upload complete',
        data: result.Location,
      };
    } catch (error) {
      console.error('Error completing upload:', error);
      throw new BadRequestException('Error completing upload');
    }
  }
  @Get('download')
  async downloadVideo(
    @Query('fileName') fileName: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const range = req.headers.range; // Range header in the request specifies which byte range the client wants.

      if (!fileName) {
        return res.status(400).json({
          success: false,
          message: 'Missing required query parameter: fileName',
        });
      }

      if (!range) {
        return res.status(400).send('Requires Range header');
      }

      const videoChunk = await this.fileUploadService.getVideoChunk(
        fileName,
        range,
      );

      res.set({
        'Content-Range': videoChunk.contentRange,
        'Accept-Ranges': 'bytes',
        'Content-Length': videoChunk.contentLength,
        'Content-Type': videoChunk.contentType,
      });

      return res.status(206).send(videoChunk.data); // Send video chunk
    } catch (error) {
      console.error('Error streaming video:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing request',
        error: error.message,
      });
    }
  }
}
