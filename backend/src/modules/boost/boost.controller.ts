import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { BoostService } from './boost.service';
import { BoostPostDto } from './boost.dto';

@Controller('boost')
export class BoostController {
  constructor(private readonly boostService: BoostService) {}

  @Post()
  async boostPost(@Req() req: any, @Body() boostPostDto: BoostPostDto) {
    const userId = req.user._id;
    const { postId } = boostPostDto;
    return this.boostService.boostPost(userId, postId);
  }
}
