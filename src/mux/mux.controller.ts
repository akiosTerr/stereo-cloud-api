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

  @Get()
  findAll() {
    return this.muxService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.muxService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.muxService.remove(id);
  }
}
