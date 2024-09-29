import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RegisterUserDto } from 'src/modules/user/register-user.dto';
import { UpdateUserDto } from 'src/modules/user/update-user.dto';
import { IUser } from './user.interface';
import { ImageUploadService } from '../fileUpload/file-upload-service';
import { UserIndustryService } from '../user-industry/user-industry.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel('User') private userModel: Model<IUser>,

    private userIndustryService: UserIndustryService,
    private imageUploadService: ImageUploadService,
  ) {}

  async registerUser(
    registerUserDto: RegisterUserDto,
  ): Promise<{ newUser: IUser; userExists?: boolean }> {
    const { email } = registerUserDto;
    const user = await this.userModel.findOne({ email });
    if (!user) {
      const newUser = new this.userModel(registerUserDto);
      await newUser.save();
      return { newUser };
    } else {
      return { userExists: true, newUser: user };
    }
  }

  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
    profileImageFile?: Express.Multer.File,
  ): Promise<IUser> {
    const { profileImage, industries, ...updateData } = updateUserDto;

    let existingImageUrl: string;

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    existingImageUrl = user.profileImage;

    if (typeof profileImage === 'string' && profileImage.startsWith('http')) {
      existingImageUrl = profileImage;
    } else if (profileImage && profileImage.startsWith('data:image')) {
      if (existingImageUrl) {
        await this.imageUploadService.deleteFile(existingImageUrl);
      }

      const matches = profileImage.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid base64 image format');
      }
      const mimeType = matches[1];
      const base64Data = matches[2];

      const s3Response = await this.imageUploadService.uploadBase64Image(
        base64Data,
        'profile-image.png',
        mimeType,
      );
      existingImageUrl = s3Response.Location;
    } else if (profileImageFile) {
      if (existingImageUrl) {
        await this.imageUploadService.deleteFile(existingImageUrl);
      }

      const s3Response =
        await this.imageUploadService.uploadFile(profileImageFile);
      existingImageUrl = s3Response.Location;
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { ...updateData, profileImage: existingImageUrl },
        { new: true },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    if (industries) {
      await this.userIndustryService.updateUserIndustries(userId, industries);
    }

    return updatedUser;
  }

  async getUserById(userId: string): Promise<IUser> {
    const user = await this.userModel.findOne({ _id: userId });
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    const deletedUser = await this.userModel.findOneAndDelete({ _id: userId });
    if (!deletedUser) {
      throw new NotFoundException('User not found!');
    }
  }

  async getUserDetail(userId: string): Promise<any> {
    const user = await this.userModel.findOne({ _id: userId });
    if (!user) {
      throw new NotFoundException('User not found!');
    }

    return { ...user.toObject() };
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async updateFocusLevel(userId: string, focusLevel: string): Promise<IUser> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { focusLevel }, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async searchUsersByName(
    keyword: string,
    page: number,
    limit: number,
    returnAllOnNoMatch: boolean = false,
  ): Promise<{ users: IUser[]; count: number }> {
    const keywordParts = keyword.trim().split(/\s+/);

    const query =
      keywordParts.length === 1
        ? {
            $or: [
              { firstName: { $regex: keywordParts[0], $options: 'i' } },
              { lastName: { $regex: keywordParts[0], $options: 'i' } },
              { email: { $regex: keywordParts[0], $options: 'i' } },
            ],
          }
        : {
            $and: [
              { firstName: { $regex: keywordParts[0], $options: 'i' } },
              { lastName: { $regex: keywordParts[1], $options: 'i' } },
            ],
          };

    // Fetch users based on the query, including pagination
    const users = await this.userModel
      .find(query)
      .sort({ firstName: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();

    // Count the total number of matching documents
    const count = await this.userModel.countDocuments(query).exec();

    // Handle the case where no matches are found
    if (returnAllOnNoMatch && users.length === 0 && keyword) {
      return { users: [], count: 0 };
    }

    return { users, count };
  }

  async getTopCollaborators(): Promise<IUser[]> {
    return this.userModel.find().sort({ boostScore: -1 }).limit(5).exec();
  }

  async findById(userId: Types.ObjectId): Promise<IUser> {
    return this.userModel.findById(userId).select('firstName lastName').exec();
  }
}
