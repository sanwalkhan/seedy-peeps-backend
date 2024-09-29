import { Controller, Post, Body, Req } from '@nestjs/common';
import { ReactionService } from './reaction.service';
import { ToggleReactionDto } from './reaction.dto';

@Controller('reactions')
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @Post('toggle')
  async toggleReaction(
    @Body() toggleReactionDto: ToggleReactionDto,
    @Req() request,
  ) {
    const userId = request.user._id;

    return this.reactionService.toggleReaction(userId, toggleReactionDto);
  }
}
