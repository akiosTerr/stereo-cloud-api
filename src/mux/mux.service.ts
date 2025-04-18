import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import fetch from 'node-fetch';
import { Video, VideoStatus } from './entities/video.entity';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class MuxService {
    constructor(
        @InjectRepository(Video) private repo: Repository<Video>,
        private usersService: UsersService
    ) { }

    private readonly muxTokenId = process.env.MUX_TOKEN_ID;
    private readonly muxTokenSecret = process.env.MUX_TOKEN_SECRET;

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

    async createUpload(): Promise<any> {
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
                    playback_policy: ['public'],
                    video_quality: 'basic',
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new InternalServerErrorException(`Mux upload failed: ${errorText}`);
        }

        return response.json();
    }

    async create(data: {
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

    findAll() {
        return this.repo.find({ relations: ['user'] });
    }

    findOne(id: string) {
        return this.repo.findOne({ where: { id }, relations: ['user'] });
    }

    remove(id: string) {
        return this.repo.delete(id);
    }

}