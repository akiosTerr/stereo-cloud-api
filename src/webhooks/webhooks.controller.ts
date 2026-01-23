import { Body, Controller, HttpCode, Post, Req, Headers, Res, HttpStatus } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { VideoStatus } from 'src/mux/entities/video.entity';


export type MuxBodyWebHook = {
    type: VideoStatus
    data: {
      id: string
      upload_id: string
      meta: {
        title?: string
        creator_id: string
      }
      playback_ids : [{id: string, policy: string}]
    }
}

@Controller('webhooks/mux')
export class WebhooksController {
  constructor(
    private webhooksService: WebhooksService,
  ) {}

  @Post()
  @HttpCode(200) 
  handleMuxWebhook(@Body() body: MuxBodyWebHook, @Headers() muxSignature: string) {
    return this.webhooksService.handleMuxWebhook(body, muxSignature);
  }
}
