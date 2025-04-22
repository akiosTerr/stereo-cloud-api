import { Body, Controller, HttpCode, Post, Req, Headers, Res, HttpStatus } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { verifyMuxSignature } from 'src/utils/muxUtils';
import { MuxService } from 'src/mux/mux.service';
import { VideoStatus } from 'src/mux/entities/video.entity';


type MuxBodyWebHook = {
    type: VideoStatus
    data: {
      id: string
      upload_id: string
      meta: {
        title?: string
        creator_id: string
      }
      playback_ids : [{id: string}]
    }
}

@Controller('webhooks/mux')
export class WebhooksController {
  constructor(
    private muxService: MuxService,
    private webhooksService: WebhooksService
  ) {}

  @Post()
  @HttpCode(200) 
  handleMuxWebhook(@Body() body: MuxBodyWebHook, @Headers() muxSignature: string) {
    console.log('Mux Webhook received:', body);

    const eventType = body?.type;
    const assetId = body?.data?.id;
    const uploadId = body?.data?.upload_id;
    console.log("event type: ", eventType);
    console.log(body);
    
    
    if (eventType === VideoStatus.CREATED) {
      const videoData = {
        user_id: body?.data?.meta.creator_id,
        upload_id: body?.data?.upload_id,
        asset_id: body?.data?.id,
        playback_id: body?.data?.playback_ids[0].id,
        title: body?.data?.meta.title,
        status: VideoStatus.CREATED
      }
      this.muxService.createVideo(videoData)
      console.log(`New video created: asset_id=${assetId}, upload_id=${uploadId}`);
    }

    return 'OK';
  }
}
