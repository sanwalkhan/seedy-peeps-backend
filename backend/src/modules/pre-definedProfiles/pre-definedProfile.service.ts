import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PredefinedProfile,
  PredefinedProfileDocument,
} from 'src/schemas/predefined-profiles.schema';
import { ImageUploadService } from '../fileUpload/file-upload-service';
@Injectable()
export class PredefinedProfileService {
  constructor(
    @InjectModel(PredefinedProfile.name)
    private predefinedProfileModel: Model<PredefinedProfileDocument>,
    private readonly imageUploadService: ImageUploadService,
  ) {}

  async findById(id: string): Promise<PredefinedProfile> {
    return this.predefinedProfileModel.findById(id).exec();
  }

  async findAll(): Promise<PredefinedProfile[]> {
    return this.predefinedProfileModel.find().exec();
  }

  async create(profile: string): Promise<PredefinedProfile> {
    const newProfile = new this.predefinedProfileModel({ profile });
    return newProfile.save();
  }

  async uploadPredefinedProfileImage(
    base64Data: string,
    fileName: string,
    mimeType: string,
  ): Promise<PredefinedProfile> {
    const s3Response = await this.imageUploadService.uploadBase64Image(
      base64Data,
      fileName,
      mimeType,
    );
    const newProfile = new this.predefinedProfileModel({
      profile: s3Response.Location,
    });
    return newProfile.save();
  }
}
