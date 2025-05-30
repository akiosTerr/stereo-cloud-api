import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import fetch from 'node-fetch';
import * as JWT from 'jsonwebtoken';
import Mux from '@mux/mux-node';
import { Video, VideoStatus } from './entities/video.entity';
import { Repository } from 'typeorm';

enum VideoQuality {
    basic = "basic",
    plus = "plus",
    premium = "premium",
}

enum PlaybackPolicy {
    public = "public",
    signed = "signed",
}

@Injectable()
export class MuxService {
    constructor(
        @InjectRepository(Video) private repo: Repository<Video>,
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

        return response.json();
    }

    async createUpload(data: {
        title?: string;
        userId: string;
    }): Promise<any> {
        if (!this.muxTokenId || !this.muxTokenSecret) {
            throw new InternalServerErrorException('MUX credentials are missing');
        }

        const credentials = Buffer.from(`${this.muxTokenId}:${this.muxTokenSecret}`).toString('base64');

        const response = await fetch('https://api.mux.com/video/v1/uploads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${credentials}`,
            },
            body: JSON.stringify({
                cors_origin: '*',
                new_asset_settings: {
                    playback_policies: [PlaybackPolicy.signed],
                    video_quality: VideoQuality.plus,
                    meta: {
                        title: data.title ? data.title : '',
                        creator_id: data.userId
                    }
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new InternalServerErrorException(`Mux upload failed: ${errorText}`);
        }

        return response.json();
    }

    async createVideo(data: {
        user_id: string;
        upload_id: string;
        asset_id: string;
        playback_id: string;
        title?: string;
        status?: VideoStatus;
    }) {
        const video = this.repo.create({ ...data });
        return this.repo.save(video);
    }

    async signVideoToken(playback_id: string) {

        let baseOptions = {
            keyId: this.muxSigningKey,
            keySecret: this.muxSigningSecret,
            expiration: '1d',
        }

        const token = await this.muxClient.jwt.signPlaybackId(playback_id, { ...baseOptions, type: 'video' });

        return { token }


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

    findAll(user_id: string) {
        return this.repo.find({
            where: { user_id },
        });
    }

    findOne(playback_id: string) {
        return this.repo.findOne({ where: { playback_id }, relations: ['user'] });
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