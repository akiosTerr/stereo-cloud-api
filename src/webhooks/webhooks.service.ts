import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MuxService } from 'src/mux/mux.service';
import { MuxBodyWebHook, WebhookStreamStatus, WebhookVideoStatus } from './webhooks.types';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class WebhooksService {
    constructor(
        private readonly muxService: MuxService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private readonly usersService: UsersService,
    ) { }

    async handleMuxWebhook(body: MuxBodyWebHook, muxSignature: string) {
        const eventType = body?.type;
        const assetId = body?.data?.id;
        const uploadId = body?.data?.upload_id;


        if (eventType === WebhookVideoStatus.CREATED) {

            let description = '';
            if (uploadId) {
                const cacheKey = `description_${uploadId}`;
                const cachedDescription = await this.cacheManager.get<string>(cacheKey);    
                description = cachedDescription || '';
            }


            let channel_name: string | undefined;
            let userId: string | undefined;
            let title: string | undefined;
            let live_stream_id: string | undefined;
            if (body?.data?.meta) {
                userId = body?.data?.meta.creator_id;
                title = body?.data?.meta.title;
                if (userId) {
                    const user = await this.usersService.findOne(userId);
                    channel_name = user?.channel_name;
                }
            } else if (body?.data?.live_stream_id) {
                const liveStream = await this.muxService.findLiveStreamByLiveStreamId(body?.data?.live_stream_id);
                userId = liveStream?.user_id;
                title = liveStream?.title;
                live_stream_id = body?.data?.live_stream_id;
                if (userId) {
                    const user = await this.usersService.findOne(userId);
                    channel_name = user?.channel_name;
                }
            }



            const videoData = {
                user_id: userId,
                upload_id: body?.data?.upload_id || '',
                asset_id: body?.data?.id,
                playback_id: body?.data?.playback_ids[0].id,
                isPrivate: body?.data?.playback_ids[0].policy === 'signed',
                live_stream_id: live_stream_id || null,
                title: title,
                description: description,
                channel_name: channel_name,
                status: WebhookVideoStatus.CREATED,
            }
            this.muxService.createVideo(videoData)
            console.log(`New video created: asset_id=${assetId}, upload_id=${uploadId}`);
        } else if (eventType === WebhookVideoStatus.READY && !body?.data?.live_stream_id) {
            this.muxService.updateVideoStatus({
                asset_id: assetId,
                status: WebhookVideoStatus.READY,
                duration: body?.data?.duration,
            })
            console.log(`Video updated: asset_id=${assetId}, upload_id=${uploadId}`);
        }
        else if (eventType === WebhookStreamStatus.LIVE_STREAM_ACTIVE) {
            console.log("live stream active");
            
            this.muxService.updateLiveStreamStatus({
                id: body?.data?.id,
                status: WebhookStreamStatus.LIVE_STREAM_ACTIVE,
            })
        } else if (eventType === WebhookStreamStatus.LIVE_STREAM_COMPLETED) {
            this.muxService.updateVideoStatusByLiveStreamId({
                live_stream_id: body?.data?.live_stream_id,
                status: WebhookVideoStatus.READY,
                duration: body?.data?.duration,
            })
            this.muxService.updateLiveStreamStatus({
                id: body?.data?.live_stream_id,
                status: WebhookStreamStatus.LIVE_STREAM_COMPLETED,
            })
        }

        return 'OK';
    }

}