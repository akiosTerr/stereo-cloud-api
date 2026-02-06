import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { LiveCommentsService } from './live-comments.service';
import { LiveCommentsGateway } from './live-comments.gateway';
import { CreateLiveCommentDto } from './dto/create-live-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from '../users/users.service';

@Controller('live-comments')
export class LiveCommentsController {
  constructor(
    private readonly liveCommentsService: LiveCommentsService,
    private readonly liveCommentsGateway: LiveCommentsGateway,
    private readonly usersService: UsersService,
  ) {}

  @Get(':videoId')
  getComments(@Param('videoId') videoId: string) {
    return this.liveCommentsService.getComments(videoId);
  }

  @Post(':videoId')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Param('videoId') videoId: string,
    @Body() dto: CreateLiveCommentDto,
    @CurrentUser() user: { userId: string },
  ) {
    const userEntity = await this.usersService.findOne(user.userId);
    if (!userEntity) {
      throw new InternalServerErrorException('User not found');
    }
    const comment = this.liveCommentsService.addComment(
      videoId,
      user.userId,
      {
        id: userEntity.id,
        name: userEntity.name,
        channel_name: userEntity.channel_name,
        email: userEntity.email,
      },
      dto.content,
    );
    this.liveCommentsGateway.broadcastNewComment(videoId, comment);
    return comment;
  }

  @Delete(':videoId/:commentId')
  @UseGuards(JwtAuthGuard)
  deleteComment(
    @Param('videoId') videoId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const deleted = this.liveCommentsService.deleteComment(videoId, commentId, user.userId);
    if (!deleted) {
      throw new NotFoundException('Comment not found or you can only delete your own comments');
    }
    this.liveCommentsGateway.broadcastCommentDeleted(videoId, commentId);
  }
}
