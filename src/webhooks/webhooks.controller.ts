import { Body, Controller, HttpCode, Post, Headers } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { MuxBodyWebHook } from './webhooks.types';

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
