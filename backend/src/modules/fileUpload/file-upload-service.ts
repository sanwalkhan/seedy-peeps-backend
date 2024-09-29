import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);
  private readonly AWS_S3_BUCKET = process.env.AWS_S3_BUCKET_NAME;
  private readonly s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  async uploadBase64Image(
    base64Data: string,
    fileName: string,
    mimeType: string,
  ) {
    if (!base64Data) {
      throw new BadRequestException('No base64 data provided');
    }

    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64String, 'base64');

    const fileKey = `${uuidv4()}_${fileName}`;

    this.logger.log(`Uploading file: ${fileName}`);
    try {
      const s3Response = await this.s3_upload(
        buffer,
        this.AWS_S3_BUCKET,
        fileKey,
        mimeType,
      );
      return s3Response;
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      throw new BadRequestException('File upload failed');
    }
  }

  async uploadFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileKey = `${uuidv4()}_${file.originalname}`;

    this.logger.log(`Uploading file: ${file.originalname}`);
    try {
      const s3Response = await this.s3_upload(
        file.buffer,
        this.AWS_S3_BUCKET,
        fileKey,
        file.mimetype,
      );
      return s3Response;
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      throw new BadRequestException('File upload failed');
    }
  }

  private async s3_upload(
    fileBuffer: Buffer,
    bucket: string,
    name: string,
    mimetype: string,
  ) {
    const params = {
      Bucket: bucket,
      Key: name,
      Body: fileBuffer,
      ContentType: mimetype,
    };

    try {
      const s3Response = await this.s3.upload(params).promise();
      this.logger.log(`File uploaded successfully: ${s3Response.Location}`);
      return s3Response;
    } catch (error) {
      this.logger.error(`S3 upload error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteFile(fileUrl: string) {
    const fileName = fileUrl.split('/').pop();
    const params = {
      Bucket: this.AWS_S3_BUCKET,
      Key: fileName,
    };

    try {
      await this.s3.deleteObject(params).promise();
      this.logger.log(`File deleted successfully: ${fileName}`);
    } catch (error) {
      this.logger.error(`S3 delete error: ${error.message}`, error.stack);
      throw new BadRequestException('File deletion failed');
    }
  }
}
