import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { MuxService } from './mux.service';
import { VideoStatus } from './entities/video.entity';

@Controller('mux')
export class MuxController {
  videosService: any;
  constructor(private readonly muxService: MuxService) { }

  @Get('assets')
  async getAssets() {
    return this.muxService.getAssets();
  }

  @Post('upload')
  async createUpload() {
    return this.muxService.createUpload();
  }

  @Post()
  create(
    @Body()
    body: {
      user_id: string;
      upload_id: string;
      asset_id: string;
      playback_id: string;
      title?: string;
      status?: VideoStatus;
    }
  ) {
    return this.muxService.create(body);
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
