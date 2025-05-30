import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { MuxService } from './mux.service';
import { VideoStatus } from './entities/video.entity';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('mux')
export class MuxController {
  videosService: any;
  constructor(private readonly muxService: MuxService) { }

  @Get('assets')
  async getAssets() {
    return this.muxService.getAssets();
  }

  @Post('upload')
  async createUpload(@Body() body: {
    title?: string
  }, @CurrentUser() user: { userId: string }
  ) {
    return this.muxService.createUpload({ userId: user.userId, ...body });
  }

  @Post()
  createVideo(
    @Body() body: {
      upload_id: string;
      asset_id: string;
      playback_id: string;
      title?: string;
      status?: VideoStatus;
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
    return this.muxService.findAll(user.userId);
  }

  @Get(':playback_id')
  findOne(@Param('playback_id') playback_id: string) {
    return this.muxService.findOne(playback_id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const video = await this.findOne(id)
    return this.muxService.remove(id, video.asset_id);
  }
}
