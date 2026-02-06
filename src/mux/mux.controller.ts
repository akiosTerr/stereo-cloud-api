import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MuxService } from './mux.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AdminGuard } from 'src/auth/admin.guard';
import { WebhookVideoStatus } from 'src/webhooks/webhooks.types';

@UseGuards(JwtAuthGuard)
@Controller('mux')
export class MuxController {
  videosService: any;
  constructor(private readonly muxService: MuxService) { }

  @Get('assets')
  @UseGuards(AdminGuard)
  async getAssets() {
    return this.muxService.getAssets();
  }

  @Post('upload')
  async createUpload(@Body() body: {
    title?: string
    description?: string
    isPrivate?: boolean
  }, @CurrentUser() user: { userId: string }
  ) {
    return this.muxService.createUpload({ userId: user.userId, ...body });
  }

  @Post('live-stream')
  async createLiveStream(@Body() body: {
    title?: string
    isPrivate?: boolean;
  }, @CurrentUser() user: { userId: string }
  ) {
    return this.muxService.createLiveStream({ userId: user.userId, ...body });
  }

  @Get('live-streams/active')
  getPublicActiveLiveStreams() {
    return this.muxService.findAllPublicActiveLiveStreams();
  }

  @Get('live-streams')
  getLiveStreams(@CurrentUser() user: { userId: string }) {
    return this.muxService.findAllLiveStreamsByUserId(user.userId);
  }

  @Delete('live-streams/:id')
  deleteLiveStream(@Param('id') id: string) {
    return this.muxService.deleteLiveStream(id);
  }

  @Get('player/:playback_id')
  async findOne(@Param('playback_id') playback_id: string) {
    return this.muxService.GetPlayerDataByPlaybackId(playback_id);
  }

  @Post()
  createVideo(
    @Body() body: {
      upload_id: string;
      asset_id: string;
      playback_id: string;
      title?: string;
      description?: string;
      status?: WebhookVideoStatus;
      duration?: number;
      live_stream_id?: string;
    },
    @CurrentUser() user: { userId: string }
  ) {
    return this.muxService.createVideo({
      user_id: user.userId,
      ...body,
    });
  }

  @Post('sign/:playback_id')
  signVideoToken(@Param('playback_id') playback_id: string) {
    return this.muxService.signVideoToken(playback_id);
  }

  @Get()
  findAll(
    @CurrentUser() user: { userId: string }
  ) {
    return this.muxService.findAllPublic(user.userId);
  }

  @Get('home')
  getHomeVideos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.muxService.getHomeVideos(pageNum, limitNum);
  } 

  @Get('private')
  findAllPrivate(
    @CurrentUser() user: { userId: string }
  ) {
    return this.muxService.findAllPrivate(user.userId);
  }

  @Get('profile/:channel_name')
  findProfileByChannelName(@Param('channel_name') channel_name: string) {
    return this.muxService.findProfileByChannelName(channel_name);
  }

  @Post('share')
  async shareVideo(
    @Body() body: { videoId: string; userId: string },
    @CurrentUser() user: { userId: string }
  ) {
    return this.muxService.shareVideoWithUser(body.videoId, body.userId, user.userId);
  }

  @Delete('share/:videoId/:userId')
  async unshareVideo(
    @Param('videoId') videoId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: { userId: string }
  ) {
    return this.muxService.unshareVideoWithUser(videoId, userId, user.userId);
  }

  @Get('shared')
  async getSharedVideos(@CurrentUser() user: { userId: string }) {
    return this.muxService.getSharedVideosForUser(user.userId);
  }

  @Get('video/:videoId/shared-with')
  async getUsersVideoIsSharedWith(
    @Param('videoId') videoId: string,
    @CurrentUser() user: { userId: string }
  ) {
    return this.muxService.getUsersVideoIsSharedWith(videoId, user.userId);
  }

  @Get('video/:videoId/comments')
  async getComments(@Param('videoId') videoId: string) {
    return this.muxService.getCommentsByVideoId(videoId);
  }

  @Post('video/:videoId/comments')
  async createComment(
    @Param('videoId') videoId: string,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: { userId: string }
  ) {
    return this.muxService.createComment(videoId, user.userId, createCommentDto.content);
  }

  @Delete('comments/:commentId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: { userId: string }
  ) {
    return this.muxService.deleteComment(commentId, user.userId);
  }

  @Get('video/:videoId/livestream-status')
  async getLivestreamStatus(@Param('videoId') videoId: string) {
    return this.muxService.getLivestreamStatusByVideoId(videoId);
  }

  @Patch('video/:id')
  async updateVideo(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string },
    @CurrentUser() user: { userId: string },
  ) {
    return this.muxService.updateVideoMetadata(id, user.userId, body);
  }

  @Delete(':id/:asset_id')
  async remove(@Param('id') id: string, @Param('asset_id') asset_id: string) {
    return this.muxService.remove(id, asset_id);
  }
}
