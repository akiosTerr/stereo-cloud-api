import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum VideoStatus {
    PREPARING = "preparing",
    CREATED = 'video.asset.created',
    READY = 'video.asset.ready',
}

@Entity('videos')
export class Video {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => User, (user) => user.videos, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    upload_id: string;

    @Column()
    asset_id: string;

    @Column()
    playback_id: string;

    @Column({ nullable: true })
    title?: string;

    @Column({ nullable: true, type: 'text' })
    description?: string;

    @Column({ nullable: true })
    channel_name?: string;

    @Column({
        type: 'text',
        default: VideoStatus.PREPARING,
    })
    status: VideoStatus;

    @Column({ default: false })
    isPrivate: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}