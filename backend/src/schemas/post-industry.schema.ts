  import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
  import { Document, Types } from 'mongoose';
  import { Post } from './post.schema';
  import { IndustryTitle } from './industry-type.schema';

  @Schema({
    timestamps: true,
    versionKey: false,
  })
  export class PostIndustry extends Document {
    @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
    post: Post;

    @Prop({ type: Types.ObjectId, ref: 'IndustryTitle', required: true })
    industry: IndustryTitle;
  }

  export const PostIndustrySchema = SchemaFactory.createForClass(PostIndustry);
