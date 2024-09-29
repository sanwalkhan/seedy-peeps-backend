import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Post } from 'src/schemas/post.schema';
import { PostIndustryService } from '../post-industry/post-industry.service';
import { CreatePostDto } from './create-post.dto';
import { UpdatePostDto } from './update-post.dto';
import { IndustryTitle } from 'src/schemas/industry-type.schema';
import { Reaction } from 'src/schemas/reaction.schema';
import { PostIndustry } from 'src/schemas/post-industry.schema';
import { User } from 'src/schemas/user.schema';
import { Boost } from 'src/schemas/boost.schema';
import { UserIndustry } from 'src/schemas/user-industry.schema';

@Injectable()
export class PostService {
  constructor(
    @InjectModel(Post.name)
    private readonly postModel: Model<Post>,
    private readonly postIndustryService: PostIndustryService,
    @InjectModel('Reaction') private readonly reactionModel: Model<Reaction>,
    @InjectModel('PostIndustry')
    private readonly postIndustryModel: Model<PostIndustry>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(IndustryTitle.name)
    private readonly industryTitleModel: Model<IndustryTitle>,
    @InjectModel(Boost.name) private readonly boostModel: Model<Boost>,
    @InjectModel(UserIndustry.name)
    private userIndustryModel: Model<UserIndustry>,
  ) {}

  async create(createPostDto: CreatePostDto, user: User): Promise<Post> {
    const { attachments, industry, caption, ...postData } = createPostDto;

    let finalCaption = '';

    try {
      // Validate that there is at least one industry and at most three
      if (!industry || industry.length === 0 || industry.length > 3) {
        throw new BadRequestException(
          'At least one and at most three industries are required',
        );
      }

      finalCaption = caption ? caption : '';
      console.log(attachments);
      // Create the post
      const newPost = new this.postModel({
        ...postData,
        user: user._id,
        focusLevel: user.focusLevel,
        attachments: attachments,
        caption: finalCaption,
      });

      const savedPost = await newPost.save();

      // Create PostIndustry entries
      const postIndustryPromises = industry.map((ind) => {
        const createPostIndustryDto = {
          post: new Types.ObjectId(savedPost._id),
          industry: new Types.ObjectId(ind),
        };
        return this.postIndustryService.create(createPostIndustryDto);
      });

      await Promise.all(postIndustryPromises);

      return savedPost;
    } catch (error) {
      throw new Error('Failed to create post');
    }
  }

  async updatePost(
    postId: string,
    updatePostDto: UpdatePostDto,
  ): Promise<Post> {
    const { attachments, industry, caption } = updatePostDto;
    try {
      // Find the existing post
      const existingPost = await this.postModel.findById(postId).exec();
      if (!existingPost) {
        throw new Error('Post not found.');
      }

      // Handle attachment update if provided
      if (attachments !== undefined) {
        const currentAttachments = existingPost.attachments || [];

        // Determine new attachments (that are not already present)
        const newAttachments = attachments.filter(
          (attachment) =>
            !currentAttachments.some(
              (current) =>
                current.fileName === attachment.fileName &&
                current.type === attachment.type,
            ),
        );

        // Determine deleted attachments (that are no longer present)
        const deletedAttachments = currentAttachments.filter(
          (current) =>
            !attachments.some(
              (attachment) =>
                attachment.fileName === current.fileName &&
                attachment.type === current.type,
            ),
        );

        // Update existing post attachments
        existingPost.attachments = existingPost.attachments
          .filter(
            (current) =>
              !deletedAttachments.some(
                (deleted) =>
                  deleted.fileName === current.fileName &&
                  deleted.type === current.type,
              ),
          )
          .concat(newAttachments);
      }

      // Update other fields if provided
      if (caption !== undefined) {
        existingPost.caption = caption;
      }

      // Save the updated post
      const updatedPost = await existingPost.save();

      // Delete existing PostIndustry entries
      await this.postIndustryService.deleteByPostId(postId);

      // Create new PostIndustry entries if industries are provided
      if (industry && industry.length > 0) {
        const postIndustryPromises = industry.map((ind) => {
          const createPostIndustryDto = {
            post: new Types.ObjectId(postId),
            industry: new Types.ObjectId(ind),
          };
          return this.postIndustryService.create(createPostIndustryDto);
        });

        await Promise.all(postIndustryPromises);
      }

      return updatedPost;
    } catch (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }
  }

  private async fetchPostsWithDetails(
    filter: any,
    sort: any = { createdAt: -1 },
    tokenUserId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    const skip = (page - 1) * limit;

    // Fetch posts with pagination
    const posts = await this.postModel
      .find(filter)
      .populate('user')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();

    const postIds = posts.map((post) => post._id);

    // Fetch associated industries for each post
    const postIndustries = await this.postIndustryModel
      .find({ post: { $in: postIds } })
      .exec();
    const industryIds = postIndustries.map((pi) => pi.industry);

    // Fetch industry titles
    const industries = await this.industryTitleModel
      .find({ _id: { $in: industryIds } })
      .exec();
    const industryMap = new Map(
      industries.map((ind) => [ind._id.toString(), ind.title]),
    );

    // Fetch reactions for each post
    const reactions = await this.reactionModel
      .aggregate([
        { $match: { post: { $in: postIds } } },
        {
          $group: {
            _id: { post: '$post', emoji: '$emoji', emojiName: '$emojiName' },
            count: { $sum: 1 },
            users: { $push: '$user' },
          },
        },
        {
          $group: {
            _id: '$_id.post',
            reactions: {
              $push: {
                emoji: '$_id.emoji',
                emojiName: '$_id.emojiName',
                count: '$count',
                users: '$users',
              },
            },
          },
        },
      ])
      .exec();

    const reactionsMap = new Map(
      reactions.map((reaction) => [reaction._id.toString(), reaction]),
    );

    // Fetch boosts for the filtered posts
    const boosts = await this.boostModel
      .find({ post: { $in: postIds }, user: tokenUserId })
      .exec();
    const boostedPostIds = boosts.map((boost) => boost.post.toString());

    // Process posts with details
    const postsWithDetails = await Promise.all(
      posts.map(async (post) => {
        const postReactions =
          (reactionsMap.get(post._id.toString()) || {}).reactions || [];

        const reactionsWithUser = await Promise.all(
          postReactions.map(async (reaction) => {
            const reacted = reaction.users.some(
              (user) => user.toString() === tokenUserId.toString(),
            );

            const users = await this.userModel
              .find({ _id: { $in: reaction.users } }, 'firstName lastName')
              .exec();

            return {
              ...reaction,
              reacted,
              users,
            };
          }),
        );

        // Sort reactions alphabetically by emojiName
        const sortedReactions = reactionsWithUser.sort((a, b) =>
          a.emojiName.localeCompare(b.emojiName),
        );

        // Sort industries alphabetically
        const sortedIndustries = postIndustries
          .filter((pi) => pi.post.toString() === post._id.toString())
          .map((pi) => industryMap.get(pi.industry.toString()) || null)
          .filter(Boolean) // Remove null values
          .sort(); // Sort industries alphabetically

        const boosted = boostedPostIds.includes(post._id.toString());

        return {
          ...post.toObject(),
          industries: sortedIndustries,
          reactions: sortedReactions,
          boosted,
        };
      }),
    );

    const total = await this.postModel.countDocuments(filter).exec();
    const totalPages = Math.ceil(total / limit);

    return {
      items: postsWithDetails,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findAllUserPostsWithDetails(
    userId: Types.ObjectId,
    page: string = '1',
    limit: string = '10',
  ): Promise<any> {
    try {
      // Convert page and limit to numbers
      const pageNumber = parseInt(page, 10) || 1;
      const pageSize = parseInt(limit, 10) || 10;

      // Fetch user details and industries
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new Error('User not found');
      }
      const { focusLevel } = user;

      const userIndustryIds = await this.userIndustryModel
        .find({ user: userId })
        .distinct('industry')
        .exec();

      // Calculate pagination
      const skip = (pageNumber - 1) * pageSize;

      // Fetch posts with detailed information
      const postsWithDetails = await this.postModel
        .aggregate([
          {
            $lookup: {
              from: 'postindustries',
              localField: '_id',
              foreignField: 'post',
              as: 'postIndustries',
            },
          },
          {
            $lookup: {
              from: 'industrytitles',
              localField: 'postIndustries.industry',
              foreignField: '_id',
              as: 'industries',
            },
          },
          {
            $lookup: {
              from: 'reactions',
              let: { postId: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$post', '$$postId'] } } },
                {
                  $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'usersDetails',
                  },
                },
                { $unwind: '$usersDetails' },
                {
                  $group: {
                    _id: '$emoji',
                    emojiName: { $first: '$emojiName' },
                    count: { $sum: 1 },
                    users: {
                      $push: {
                        _id: '$usersDetails._id',
                        firstName: '$usersDetails.firstName',
                        lastName: '$usersDetails.lastName',
                      },
                    },
                    reacted: { $max: { $eq: ['$user', userId] } },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    emoji: '$_id',
                    emojiName: 1,
                    count: 1,
                    users: 1,
                    reacted: 1,
                  },
                },
                { $sort: { emojiName: 1 } }, // Sort reactions by emojiName
              ],
              as: 'reactions',
            },
          },
          {
            $lookup: {
              from: 'boosts',
              localField: '_id',
              foreignField: 'post',
              as: 'boosts',
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'user',
            },
          },
          { $unwind: '$user' },
          {
            $addFields: {
              boosted: { $in: [userId, '$boosts.user'] },
              industries: {
                $map: {
                  input: {
                    $sortArray: { input: '$industries', sortBy: { title: 1 } }, // Sort industries by title
                  },
                  as: 'industry',
                  in: '$$industry.title',
                },
              },
              matchIndustry: {
                $gt: [
                  {
                    $size: {
                      $setIntersection: [
                        {
                          $map: {
                            input: '$postIndustries',
                            as: 'pi',
                            in: '$$pi.industry',
                          },
                        },
                        userIndustryIds,
                      ],
                    },
                  },
                  0,
                ],
              },
              matchFocusLevel: { $eq: ['$focusLevel', focusLevel] },
            },
          },
          {
            $facet: {
              sameIndustryAndFocusLevel: [
                { $match: { matchIndustry: true, matchFocusLevel: true } },
                { $sort: { createdAt: -1 } },
              ],
              sameFocusLevelDifferentIndustry: [
                { $match: { matchIndustry: false, matchFocusLevel: true } },
                { $sort: { createdAt: -1 } },
              ],
              differentFocusLevelSameIndustry: [
                { $match: { matchIndustry: true, matchFocusLevel: false } },
                { $sort: { createdAt: -1 } },
              ],
              differentFocusLevelDifferentIndustry: [
                { $match: { matchIndustry: false, matchFocusLevel: false } },
                { $sort: { createdAt: -1 } },
              ],
              totalCount: [{ $count: 'count' }],
            },
          },
          {
            $project: {
              items: {
                $concatArrays: [
                  '$sameIndustryAndFocusLevel',
                  '$sameFocusLevelDifferentIndustry',
                  '$differentFocusLevelSameIndustry',
                  '$differentFocusLevelDifferentIndustry',
                ],
              },
              total: { $arrayElemAt: ['$totalCount.count', 0] },
            },
          },
          { $unwind: '$items' },
          { $skip: skip },
          { $limit: pageSize },
          {
            $group: {
              _id: null,
              items: { $push: '$items' },
              total: { $first: '$total' },
            },
          },
          {
            $project: {
              items: '$items',
              total: '$total',
              page: { $literal: pageNumber },
              limit: { $literal: pageSize },
              totalPages: {
                $ceil: {
                  $divide: ['$total', pageSize],
                },
              },
            },
          },
        ])
        .exec();
      // Return results with pagination details
      return (
        postsWithDetails[0] || {
          items: [],
          total: 0,
          page: pageNumber,
          limit: pageSize,
          totalPages: 0,
        }
      );
    } catch (error) {
      console.error('Failed to fetch posts with details:', error);
      throw new Error('Failed to fetch posts with details');
    }
  }

  async findUserPostsWithDetails(
    userId: Types.ObjectId,
    tokenUserId: Types.ObjectId,
    page: number = 1,
    limit: number = 10,
  ): Promise<any> {
    try {
      const filter = { user: userId };
      const sort = { createdAt: -1 };

      const result = await this.fetchPostsWithDetails(
        filter,
        sort,
        tokenUserId,
        page,
        limit,
      );

      return result;
    } catch (error) {
      console.error('Failed to fetch user posts with details:', error);
      throw new Error('Failed to fetch user posts with details');
    }
  }

  async trendingPosts(userId: Types.ObjectId): Promise<any[]> {
    try {
      const sort = { boostScore: -1, createdAt: -1 };
      const filter = {}; // No specific filter for trending posts

      const result = await this.fetchPostsWithDetails(
        filter,
        sort,
        userId,
        1,
        5,
      );

      return result.items;
    } catch (error) {
      console.error('Failed to fetch trending posts with details:', error);
      throw new Error('Failed to fetch trending posts with details');
    }
  }

  async trendingUserPosts(userId: Types.ObjectId): Promise<any[]> {
    try {
      const filter = { user: userId };
      const sort = { boostScore: -1, createdAt: -1 };

      const result = await this.fetchPostsWithDetails(
        filter,
        sort,
        userId,
        1,
        5,
      );

      if (!result.items.some((post) => post.boosted)) {
        return [];
      }

      return result.items;
    } catch (error) {
      console.error('Failed to fetch trending user posts with details:', error);
      throw new Error('Failed to fetch trending user posts with details');
    }
  }

  async filterPosts(
    userId: Types.ObjectId,
    focusLevel: string,
    boostScore: string,
    industry: string[],
    page: number,
    limit: number,
  ) {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const query: any = {};

    if (focusLevel === 'true') {
      query.focusLevel = user.focusLevel;
    }

    if (industry && industry !== undefined && industry.length > 0) {
      const industryIds = industry.map((id) => new Types.ObjectId(id));
      const postIndustries = await this.postIndustryModel
        .find({ industry: { $in: industryIds } })
        .exec();
      const postIds = postIndustries.map((pi) => pi.post);
      query._id = { $in: postIds };
    }

    const sort: any = {};
    if (boostScore === 'true') {
      sort.boostScore = -1;
      sort.createdAt = -1;
    } else {
      sort.createdAt = -1;
    }

    const posts = await this.postModel
      .find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user')
      .exec();
    const postIds = posts.map((post) => post._id);

    // Fetch associated industries for each post
    const postIndustries = await this.postIndustryModel
      .find({ post: { $in: postIds } })
      .exec();
    const industryIds = postIndustries.map((pi) => pi.industry);

    // Fetch industry titles
    const industries = await this.industryTitleModel
      .find({ _id: { $in: industryIds } })
      .sort({ createdAt: -1 })
      .exec();
    const industryMap = new Map(
      industries.map((ind) => [ind._id.toString(), ind.title]),
    );

    // Fetch reactions for each post
    const reactions = await this.reactionModel
      .aggregate([
        { $match: { post: { $in: postIds } } },
        {
          $group: {
            _id: { post: '$post', emoji: '$emoji', emojiName: '$emojiName' },
            count: { $sum: 1 },
            users: { $push: '$user' },
          },
        },
        {
          $group: {
            _id: '$_id.post',
            reactions: {
              $push: {
                emoji: '$_id.emoji',
                emojiName: '$_id.emojiName',
                count: '$count',
                users: '$users',
              },
            },
          },
        },
      ])
      .exec();

    const reactionsMap = new Map(
      reactions.map((reaction) => [reaction._id.toString(), reaction]),
    );

    // Fetch boosts for the filtered posts
    const boosts = await this.boostModel
      .find({ post: { $in: postIds }, user: userId })
      .exec();
    const boostedPostIds = boosts.map((boost) => boost.post.toString());

    const postsWithDetails = await Promise.all(
      posts.map(async (post) => {
        const postReactions =
          (reactionsMap.get(post._id.toString()) || {}).reactions || [];

        // Sort reactions by emojiName
        const reactionsWithUser = await Promise.all(
          postReactions.map(async (reaction) => {
            const reacted = reaction.users.some(
              (user) => user.toString() === userId.toString(),
            );

            const users = await this.userModel
              .find({ _id: { $in: reaction.users } }, 'firstName lastName')
              .exec();

            return {
              ...reaction,
              reacted,
              users,
            };
          }),
        ).then((reactions) =>
          reactions.sort((a, b) => a.emojiName.localeCompare(b.emojiName)),
        );

        const boosted = boostedPostIds.includes(post._id.toString());

        // Sort industries alphabetically
        const sortedIndustries = postIndustries
          .filter((pi) => pi.post.toString() === post._id.toString())
          .map((pi) => industryMap.get(pi.industry.toString()) || null)
          .filter(Boolean) // Remove null values
          .sort(); // Sort industries alphabetically

        return {
          ...post.toObject(),
          industries: sortedIndustries,
          reactions: reactionsWithUser,
          boosted,
        };
      }),
    );

    const total = await this.postModel.countDocuments(query).exec();
    const totalPages = Math.ceil(total / limit);

    return {
      items: postsWithDetails,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findSinglePostWithDetails(
    postId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<any> {
    try {
      const filter = { _id: postId };
      const result = await this.fetchPostsWithDetails(filter, {}, userId, 1, 1);
      if (result.items.length === 0) {
        throw new Error('Post not found');
      }
      return result.items[0];
    } catch (error) {
      console.error('Failed to fetch single post with details:', error);
      throw new Error('Failed to fetch single post with details');
    }
  }
  async deletePost(postId: string): Promise<{ message: string }> {
    const session = await this.postModel.db.startSession();
    session.startTransaction();
    try {
      const post = await this.postModel
        .findById(postId)
        .session(session)
        .exec();
      if (!post) {
        throw new NotFoundException('Post not found');
      }

      const postOwnerId = post.user._id.toString();
      const postBoostScore = post.boostScore;

      // Decrement the owner's boost score by the post's boost score
      await this.userModel.findByIdAndUpdate(
        postOwnerId,
        { $inc: { boostScore: -postBoostScore } },
        { session },
      );

      // Delete the post
      await this.postModel.findByIdAndDelete(postId).session(session).exec();

      // Delete related post industries
      await this.postIndustryModel
        .deleteMany({ post: postId })
        .session(session)
        .exec();

      // Delete related reactions
      await this.reactionModel
        .deleteMany({ post: postId })
        .session(session)
        .exec();

      // Delete related boosts
      await this.boostModel
        .deleteMany({ post: postId })
        .session(session)
        .exec();

      await session.commitTransaction();
      return { message: 'Post and associated industries deleted successfully' };
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException('Failed to delete post');
    } finally {
      session.endSession();
    }
  }
}
