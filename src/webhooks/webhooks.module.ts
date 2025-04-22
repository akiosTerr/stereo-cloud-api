import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { MuxModule } from 'src/mux/mux.module';
import { Video } from 'src/mux/entities/video.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [MuxModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
