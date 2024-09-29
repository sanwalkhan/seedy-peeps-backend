import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PostIndustry } from './post-industry.schema';
import { User } from './user.schema';

@Schema({ timestamps: true, versionKey: false })
export class Post extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Number, default: 0 })
  boostScore: number;

  @Prop({ type: Types.ObjectId, ref: 'PostIndustry' })
  postIndustry: PostIndustry[];

  @Prop()
  caption: string;

  @Prop({
    type: [
      { fileName: String, type: { type: String, enum: ['image', 'video'] } },
    ],
  })
  attachments: {
    fileName: string;
    type: 'image' | 'video';
  }[];

  @Prop()
  focusLevel: string;
}

export const PostSchema = SchemaFactory.createForClass(Post);
