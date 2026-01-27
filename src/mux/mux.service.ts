import { Injectable, InternalServerErrorException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import fetch from 'node-fetch';
import Mux from '@mux/mux-node';
import { Video, VideoStatus } from './entities/video.entity';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';

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

@Injectable()
export class MuxService {
    constructor(
        @InjectRepository(Video) private repo: Repository<Video>,
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
            throw new InternalServerErrorException(`Mux upload failed: ${errorText}`);
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

    async createVideo(data: {
        user_id: string;
        upload_id: string;
        asset_id: string;
        playback_id: string;
        title?: string;
        description?: string;
        channel_name?: string;
        isPrivate?: boolean;
        status?: VideoStatus;
    }) {
        const user = await this.usersService.findOne(data.user_id);
        if (user && user.channel_name) {
            data.channel_name = user.channel_name;
        }
        const video = this.repo.create({ ...data });
        return this.repo.save(video);
    }

    async updateVideoStatus(data: {
        asset_id: string;
        status?: VideoStatus;
    }) {
        const video = await this.repo.findOne({ where: { asset_id: data.asset_id } });
        if (!video) {
            throw new InternalServerErrorException('Video not found');
        }
        video.status = data.status;
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

    findAllPrivate(user_id: string) {
        return this.repo.find({
            where: { user_id, isPrivate: true },
        });
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

        return this.repo.delete(id);
    }

}