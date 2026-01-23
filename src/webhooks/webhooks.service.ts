import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MuxService } from 'src/mux/mux.service';
import { MuxBodyWebHook } from './webhooks.controller';
import { VideoStatus } from 'src/mux/entities/video.entity';

@Injectable()
export class WebhooksService {
    constructor(
        private readonly muxService: MuxService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async handleMuxWebhook(body: MuxBodyWebHook, muxSignature: string) {
        console.log('Mux Webhook received:', body);

        const eventType = body?.type;
        const assetId = body?.data?.id;
        const uploadId = body?.data?.upload_id;
        console.log("event type: ", eventType);
        if (eventType === VideoStatus.CREATED) {
            let description = '';
            if (uploadId) {
                const cacheKey = `description_${uploadId}`;
                const cachedDescription = await this.cacheManager.get<string>(cacheKey);
                description = cachedDescription || '';
            }

            const videoData = {
                user_id: body?.data?.meta.creator_id,
                upload_id: body?.data?.upload_id,
                asset_id: body?.data?.id,
                playback_id: body?.data?.playback_ids[0].id,
                isPrivate: body?.data?.playback_ids[0].policy === 'signed',
                title: body?.data?.meta.title,
                description: description,
                status: VideoStatus.CREATED,
            }
            this.muxService.createVideo(videoData)
            console.log(`New video created: asset_id=${assetId}, upload_id=${uploadId}`);
        } else if (eventType === VideoStatus.READY) {
            this.muxService.updateVideoStatus({
                asset_id: assetId,
                status: VideoStatus.READY
            })
            console.log(`Video updated: asset_id=${assetId}, upload_id=${uploadId}`);
        }

        return 'OK';
    }

}