import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MuxService } from 'src/mux/mux.service';
import { MuxBodyWebHook } from './webhooks.controller';
import { VideoStatus } from 'src/mux/entities/video.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class WebhooksService {
    constructor(
        private readonly muxService: MuxService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly usersService: UsersService,
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

            let channel_name: string | undefined;
            const userId = body?.data?.meta.creator_id;
            if (userId) {
                const user = await this.usersService.findOne(userId);
                channel_name = user?.channel_name;
            }

            const videoData = {
                user_id: userId,
                upload_id: body?.data?.upload_id,
                asset_id: body?.data?.id,
                playback_id: body?.data?.playback_ids[0].id,
                isPrivate: body?.data?.playback_ids[0].policy === 'signed',
                title: body?.data?.meta.title,
                description: description,
                channel_name: channel_name,
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