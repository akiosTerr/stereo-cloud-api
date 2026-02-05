import { Injectable, InternalServerErrorException, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import fetch from 'node-fetch';
import Mux from '@mux/mux-node';
import { Video } from './entities/video.entity';
import { SharedVideo } from './entities/shared-video.entity';
import { Comment } from './entities/comment.entity';
import { LiveStream, LiveStreamStatus} from './entities/live-stream.entity';
import { Like, Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { WebhookStreamStatus, WebhookVideoStatus } from 'src/webhooks/webhooks.types';

enum VideoQuality {
    basic = "basic",
    plus = "plus",
    premium = "premium",
}

enum PlaybackPolicy {
    public = "public",
    signed = "signed",
}

interface MuxAsset {
    id: string;
    playback_ids: {
        id: string;
        policy: PlaybackPolicy;
    }[];
}


enum LatencyMode {
    standard = "standard",
    reduced = "reduced",
    low = "low",
}

interface MuxLiveStreamResponse {
    stream_key: string;
    status: WebhookStreamStatus;
    reconnect_window: number;
    playback_ids: PlaybackId[];
    new_asset_settings: {
        playback_policies: Array<PlaybackPolicy>;
    };
    id: string;
    created_at: string;
    latency_mode: LatencyMode;
    max_continuous_duration: number;
}

interface PlaybackId {
    policy: PlaybackPolicy;
    id: string;
}

const statusMap: Record<WebhookStreamStatus, LiveStreamStatus> = {
    [WebhookStreamStatus.LIVE_STREAM_IDLE]: LiveStreamStatus.IDLE,
    [WebhookStreamStatus.LIVE_STREAM_ACTIVE]: LiveStreamStatus.ACTIVE,
    [WebhookStreamStatus.LIVE_STREAM_COMPLETED]: LiveStreamStatus.COMPLETED,
};

@Injectable()
export class MuxService {
    constructor(
        @InjectRepository(Video) private repo: Repository<Video>,
        @InjectRepository(SharedVideo) private sharedVideoRepo: Repository<SharedVideo>,
        @InjectRepository(Comment) private commentRepo: Repository<Comment>,
        @InjectRepository(LiveStream) private liveStreamRepo: Repository<LiveStream>,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private usersService: UsersService,
    ) { }

    private readonly muxTokenId = process.env.MUX_TOKEN_ID;
    private readonly muxTokenSecret = process.env.MUX_TOKEN_SECRET;
    private readonly muxSigningKey = process.env.MUX_SIGNING_KEY;
    private readonly muxSigningSecret = process.env.MUX_PRIVATE_KEY;
    private readonly muxClient = new Mux({
        tokenId: this.muxTokenId,
        tokenSecret: this.muxTokenSecret,
        jwtSigningKey: this.muxSigningKey,
        jwtPrivateKey: this.muxSigningSecret,
    });


    async getAssets(): Promise<any> {
        if (!this.muxTokenId || !this.muxTokenSecret) {
            throw new InternalServerErrorException('MUX credentials not set');
        }

        const credentials = Buffer.from(`${this.muxTokenId}:${this.muxTokenSecret}`).toString('base64');

        const response = await fetch('https://api.mux.com/video/v1/assets', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new InternalServerErrorException(`Mux API error: ${error}`);
        }

        const assets = (await response.json()).data;

        const filteredAssets = assets.filter((asset: MuxAsset) => asset.playback_ids[0].policy === PlaybackPolicy.public);

        return filteredAssets;
    }

    async createUpload(data: {
        title?: string;
        description?: string;
        isPrivate?: boolean
        userId: string;
    }): Promise<any> {
        if (!this.muxTokenId || !this.muxTokenSecret) {
            throw new InternalServerErrorException('MUX credentials are missing');
        }

        const credentials = Buffer.from(`${this.muxTokenId}:${this.muxTokenSecret}`).toString('base64');

        const policy = data.isPrivate ? PlaybackPolicy.signed : PlaybackPolicy.public;

        const response = await fetch('https://api.mux.com/video/v1/uploads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify({
                cors_origin: '*',
                new_asset_settings: {
                    playback_policies: [policy],
                    video_quality: VideoQuality.plus,
                    meta: {
                        title: data.title ? data.title : '',
                        creator_id: data.userId,
                    }
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new InternalServerErrorException(`Mux upload  failed: ${errorText}`);
        }

        const uploadResponse = await response.json();

        const uploadId = uploadResponse?.data?.id || uploadResponse?.id;
        if (data.description && uploadId) {
            const cacheKey = `description_${uploadId}`;
            // Cache for 1 hour (3600000 ms) - webhook should arrive much sooner
            await this.cacheManager.set(cacheKey, data.description, 3600000);
        }

        return uploadResponse;
    }

    async createLiveStream(data: {
        title?: string;
        isPrivate?: boolean;
        userId: string;
    }): Promise<any> {
        if (!this.muxTokenId || !this.muxTokenSecret) {
            throw new InternalServerErrorException('MUX credentials are missing');
        }

        const credentials = Buffer.from(`${this.muxTokenId}:${this.muxTokenSecret}`).toString('base64');

        const response = await fetch('https://api.mux.com/video/v1/live-streams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify({
                "playback_policies": [
                    data.isPrivate ? PlaybackPolicy.signed : PlaybackPolicy.public
                ],
                "new_asset_settings": {
                    "playback_policies": [
                        data.isPrivate ? PlaybackPolicy.signed : PlaybackPolicy.public
                    ]
                },
                meta: {
                    title: data.title,
                },
                test: true
            }),
        });
        
        

        if (!response.ok) {
            const errorText = await response.text();
            throw new InternalServerErrorException(`Mux live stream creation failed: ${errorText}`);
        }
        console.log("response: ", response);


        const liveStreamResponse = await response.json();
        const muxData = liveStreamResponse.data as MuxLiveStreamResponse;
        console.log("muxData: ", muxData);
        const playbackId = muxData.playback_ids?.[0]?.id;
        if (!playbackId) {
            throw new InternalServerErrorException('Mux live stream response missing playback_id');
        }
      
        const entity = this.liveStreamRepo.create({
            live_stream_id: muxData.id,
            title: data.title,
            isPrivate: data.isPrivate ?? false,
            user_id: data.userId,
            stream_key: muxData.stream_key,
            status: LiveStreamStatus.IDLE,
            playback_id: playbackId,
        });
        const saved = await this.liveStreamRepo.save(entity);
        return { ...liveStreamResponse, liveStream: saved };
    }

    findAllLiveStreamsByUserId(userId: string) {
        return this.liveStreamRepo.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
        });
    }

    findLiveStreamByLiveStreamId(live_stream_id: string) {
        return this.liveStreamRepo.findOne({ where: { live_stream_id } });
    }

    async updateLiveStreamStatus(data: {
        id: string;
        status: WebhookStreamStatus;
    }) {
        const liveStream = await this.liveStreamRepo.findOne({ where: { live_stream_id: data.id } });
        console.log("liveStream: ", liveStream);
        if (!liveStream) {
            throw new InternalServerErrorException('Live stream not found');
        }
        liveStream.status = statusMap[data.status] ?? LiveStreamStatus.IDLE;
        return this.liveStreamRepo.save(liveStream);
    }

    async deleteLiveStream(id: string) {
        if (!this.muxTokenId || !this.muxTokenSecret) {
            throw new InternalServerErrorException('MUX credentials are missing');
        }

        const credentials = Buffer.from(`${this.muxTokenId}:${this.muxTokenSecret}`).toString('base64');

        const response = await fetch(`https://api.mux.com/video/v1/live-streams/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new InternalServerErrorException(`Mux live stream deletion failed: ${errorText}`);
        }
        const liveStream = await this.liveStreamRepo.findOne({ where: { live_stream_id: id } });
        if (!liveStream) {
            throw new NotFoundException('Live stream not found');
        }
        await this.liveStreamRepo.delete(liveStream.id);
        return { message: 'Live stream deleted successfully' };
    }

    async createVideo(data: {
        user_id: string;
        live_stream_id?: string;
        upload_id: string;
        asset_id: string;
        playback_id: string;
        title?: string;
        description?: string;
        channel_name?: string;
        isPrivate?: boolean;
        status?: WebhookVideoStatus;
    }) {
        const user = await this.usersService.findOne(data.user_id);
        if (user && user.channel_name) {
            data.channel_name = user.channel_name;
        }
        const video = this.repo.create({ ...data, live_stream_id: data.live_stream_id ?? null });
        return this.repo.save(video);
    }

    async updateVideoStatus(data: {
        asset_id: string;
        status?: WebhookVideoStatus;
        duration?: number;
    }) {
        const video = await this.repo.findOne({ where: { asset_id: data.asset_id } });
        if (!video) {
            throw new InternalServerErrorException('Video not found');
        }
        if (data.status !== undefined) {
            video.status = data.status;
        }
        if (data.duration !== undefined) {
            video.duration = data.duration;
        }
        return this.repo.save(video);
    }

    async updateVideoStatusByLiveStreamId(data: {
        live_stream_id: string;
        status?: WebhookVideoStatus;
        duration?: number;
    }) {
        const video = await this.repo.findOne({ where: { live_stream_id: data.live_stream_id } });
        if (!video) {
            throw new InternalServerErrorException('Video not found');
        }
        if (data.status !== undefined) {
            video.status = data.status;
        }
        if (data.duration !== undefined) {
            video.duration = data.duration;
        }
        return this.repo.save(video);
    }

    async signVideoToken(playback_id: string) {

        let baseOptions = {
            keyId: this.muxSigningKey,
            keySecret: this.muxSigningSecret,
            expiration: '1d',
        }

        const tokenVideo = await this.muxClient.jwt.signPlaybackId(playback_id, { ...baseOptions, type: 'video' });
        const tokenThumbnail = await this.muxClient.jwt.signPlaybackId(playback_id, { ...baseOptions, type: 'thumbnail' });

        return { tokenVideo, tokenThumbnail }

        // const secretKey = Buffer.from(
        //     this.muxSigningSecret,
        //     "base64"
        // ).toString("ascii");

        // console.log(secretKey);
        // console.log(this.muxSigningSecret);

        // console.log(playback_id);


        // const token = await JWT.sign(
        //     {
        //         sub: playback_id,
        //         aud: "v",
        //         exp: Math.floor(Date.now() / 1000) + 60 * 60,
        //         kid: this.muxSigningKey
        //     },
        //     secretKey,
        //     { algorithm: "RS256" }
        // )

        // return {token}
    }

    async findAllPrivate(user_id: string) {
        const ownVideos = await this.repo.find({
            where: { user_id, isPrivate: true },
        });
        return ownVideos;
    }

    findAllPublic(user_id: string) {
        return this.repo.find({
            where: { user_id, isPrivate: false },
        });
    }

    getHomeVideos(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        return this.repo.find({
            where: { isPrivate: false },
            order: { created_at: 'DESC' },
            take: limit,
            skip: skip
        });
    }

    findByPlaybackId(playback_id: string) {
        return this.repo.findOne({ where: { playback_id }, relations: ['user'] });
    }

    findById(id: string) {
        return this.repo.findOne({ where: { id }, relations: ['user'] });
    }

    findProfileByChannelName(channel_name: string) {
        return this.repo.find({
            where: { channel_name: Like(`%${channel_name}%`), isPrivate: false },
            order: { created_at: 'DESC' },
        });
    }

    async remove(id: string, asset_id: string) {

        if (!this.muxTokenId || !this.muxTokenSecret) {
            throw new InternalServerErrorException('MUX credentials are missing');
        }

        const credentials = Buffer.from(`${this.muxTokenId}:${this.muxTokenSecret}`).toString('base64');

        const response = await fetch(`https://api.mux.com/video/v1/assets/${asset_id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify({
                cors_origin: '*'
            }),
        });

        await this.sharedVideoRepo.delete({ video_id: id });

        return this.repo.delete(id);
    }

    async shareVideoWithUser(videoId: string, sharedWithUserId: string, sharedByUserId: string) {
        // Verify video exists and belongs to the user sharing it
        const video = await this.repo.findOne({ where: { id: videoId } });
        if (!video) {
            throw new NotFoundException('Video not found');
        }
        if (video.user_id !== sharedByUserId) {
            throw new ForbiddenException('You can only share your own videos');
        }

        // Verify the user to share with exists
        const sharedWithUser = await this.usersService.findOne(sharedWithUserId);
        if (!sharedWithUser) {
            throw new NotFoundException('User not found');
        }

        // Check if already shared
        const existing = await this.sharedVideoRepo.findOne({
            where: { video_id: videoId, shared_with_user_id: sharedWithUserId },
        });

        if (existing) {
            return existing; // Already shared
        }

        // Create share record
        const sharedVideo = this.sharedVideoRepo.create({
            video_id: videoId,
            shared_with_user_id: sharedWithUserId,
            shared_by_user_id: sharedByUserId,
        });

        return this.sharedVideoRepo.save(sharedVideo);
    }

    async unshareVideoWithUser(videoId: string, sharedWithUserId: string, sharedByUserId: string) {
        // Verify video exists and belongs to the user
        const video = await this.repo.findOne({ where: { id: videoId } });
        if (!video) {
            throw new NotFoundException('Video not found');
        }
        if (video.user_id !== sharedByUserId) {
            throw new ForbiddenException('You can only unshare your own videos');
        }

        const result = await this.sharedVideoRepo.delete({
            video_id: videoId,
            shared_with_user_id: sharedWithUserId,
        });

        return result;
    }

    async getSharedVideosForUser(userId: string) {
        const sharedVideos = await this.sharedVideoRepo.find({
            where: { shared_with_user_id: userId },
            relations: ['video', 'video.user', 'sharedByUser'],
        });

        return sharedVideos.map(sv => ({
            ...sv.video,
            sharedBy: {
                id: sv.sharedByUser.id,
                name: sv.sharedByUser.name,
                email: sv.sharedByUser.email,
                channel_name: sv.sharedByUser.channel_name,
            },
        }));
    }

    async getUsersVideoIsSharedWith(videoId: string, ownerUserId: string) {
        const video = await this.repo.findOne({ where: { id: videoId } });
        if (!video) {
            throw new NotFoundException('Video not found');
        }
        if (video.user_id !== ownerUserId) {
            throw new ForbiddenException('You can only view sharing status of your own videos');
        }

        const sharedVideos = await this.sharedVideoRepo.find({
            where: { video_id: videoId },
            relations: ['sharedWithUser'],
        });

        return sharedVideos.map(sv => ({
            id: sv.sharedWithUser.id,
            name: sv.sharedWithUser.name,
            email: sv.sharedWithUser.email,
            channel_name: sv.sharedWithUser.channel_name,
            shared_at: sv.created_at,
        }));
    }

    async hasAccessToVideo(userId: string, videoId: string): Promise<boolean> {
        const video = await this.repo.findOne({ where: { id: videoId } });
        if (!video) {
            return false;
        }

        if (video.user_id === userId) {
            return true;
        }

        const sharedVideo = await this.sharedVideoRepo.findOne({
            where: { video_id: videoId, shared_with_user_id: userId },
        });

        return !!sharedVideo;
    }

    async createComment(videoId: string, userId: string, content: string) {
        const trimmedContent = content?.trim() || '';
        if (!trimmedContent) {
            throw new InternalServerErrorException('Comment content cannot be empty');
        }
        if (trimmedContent.length > 1000) {
            throw new InternalServerErrorException('Comment content must not exceed 1000 characters');
        }

        const video = await this.repo.findOne({ where: { id: videoId } });
        if (!video) {
            throw new NotFoundException('Video not found');
        }

        const user = await this.usersService.findOne(userId);
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const comment = this.commentRepo.create({
            video_id: videoId,
            user_id: userId,
            content: trimmedContent,
        });

        const savedComment = await this.commentRepo.save(comment);

        return this.commentRepo.findOne({
            where: { id: savedComment.id },
            relations: ['user'],
        });
    }

    async getCommentsByVideoId(videoId: string) {
        const video = await this.repo.findOne({ where: { id: videoId } });
        if (!video) {
            throw new NotFoundException('Video not found');
        }

        const comments = await this.commentRepo.find({
            where: { video_id: videoId },
            relations: ['user'],
            order: { created_at: 'DESC' },
        });

        return comments.map(comment => ({
            id: comment.id,
            video_id: comment.video_id,
            user_id: comment.user_id,
            content: comment.content,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            user: {
                id: comment.user.id,
                name: comment.user.name,
                channel_name: comment.user.channel_name,
                email: comment.user.email,
            },
        }));
    }

    async deleteComment(commentId: string, userId: string) {
        const comment = await this.commentRepo.findOne({
            where: { id: commentId },
            relations: ['user'],
        });

        if (!comment) {
            throw new NotFoundException('Comment not found');
        }

        if (comment.user_id !== userId) {
            throw new ForbiddenException('You can only delete your own comments');
        }

        await this.commentRepo.delete(commentId);
        return { message: 'Comment deleted successfully' };
    }

    async hasAccessToComment(userId: string, commentId: string): Promise<boolean> {
        const comment = await this.commentRepo.findOne({
            where: { id: commentId },
        });

        if (!comment) {
            return false;
        }

        return comment.user_id === userId;
    }

}