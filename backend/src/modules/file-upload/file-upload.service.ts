import { BadRequestException, Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class FileUploadService {
  private s3: AWS.S3;
  private bucketName: string;

  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.BUCKET_REGION,
      useAccelerateEndpoint: true,
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME;
  }

  async uploadSingleFile(fileBuffer: Buffer, fileName: string) {
    const params = {
      Bucket: this.bucketName,
      Key: fileName,
      Body: fileBuffer,
    };
    return this.s3.upload(params).promise();
  }

  async initiateUpload(fileName: string) {
    const params = {
      Bucket: this.bucketName,
      Key: fileName,
    };
    const upload = await this.s3.createMultipartUpload(params).promise();
    return upload.UploadId;
  }

  async uploadPart(
    fileBuffer: Buffer,
    uploadId: string,
    fileName: string,
    index: number,
  ) {
    const partNumber = Number(index) + 1;
    const params = {
      Bucket: this.bucketName,
      Key: fileName,
      Body: fileBuffer,
      PartNumber: partNumber,
      UploadId: uploadId,
    };
    return this.s3.uploadPart(params).promise();
  }

  async completeUpload(fileName: string, uploadId: string) {
    const params = {
      Bucket: this.bucketName,
      Key: fileName,
      UploadId: uploadId,
    };
    const partsData = await this.s3.listParts(params).promise();

    const parts = partsData.Parts.map((part) => ({
      ETag: part.ETag, //a unique identifier
      PartNumber: part.PartNumber,
    }));

    return this.s3
      .completeMultipartUpload({
        ...params,
        MultipartUpload: { Parts: parts },
      })
      .promise();
  }

  async getVideoChunk(fileName: string, range: string) {
    const s3Params = {
      Bucket: this.bucketName,
      Key: fileName,
    };

    try {
      // Get metadata of the video file from S3
      const headData = await this.s3.headObject(s3Params).promise();
      const fileSize = headData.ContentLength;

      // Parse the Range header to determine the starting byte
      const parts = range.replace(/bytes=/, '').split('-'); //(bytes = 0 - 1024) removes the "bytes=" part and splits the range into two values: the start byte and the end byte.
      const start = parseInt(parts[0], 10);
      const chunkSize = 7 * 1024 * 1024; // 7MB chunk size
      const end = Math.min(start + chunkSize - 1, fileSize - 1); //To ensure that we don’t fetch beyond the size of the file, especially near the end of the file.

      s3Params['Range'] = `bytes=${start}-${end}`;

      // Fetch the video chunk from S3
      const data = await this.s3.getObject(s3Params).promise();

      // Return video chunk details
      return {
        data: data.Body,
        contentType: headData.ContentType,
        contentRange: `bytes ${start}-${end}/${fileSize}`,
        contentLength: end - start + 1, //The length of the chunk in bytes
        fileSize,
      };
    } catch (error) {
      console.error('Error getting video chunk:', error);
      throw new BadRequestException('Error fetching video chunk');
    }
  }
}
