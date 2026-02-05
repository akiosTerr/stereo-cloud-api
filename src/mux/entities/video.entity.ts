import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { SharedVideo } from './shared-video.entity';
import { Comment } from './comment.entity';
import { WebhookVideoStatus } from 'src/webhooks/webhooks.types';

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

    @Column({ nullable: true, type: 'float' })
    duration?: number;

    @Column({ nullable: true })
    channel_name?: string;

    @Column({ nullable: true, type: 'uuid' })
    live_stream_id?: string;

    @Column({
        type: 'text',
        default: WebhookVideoStatus.CREATED,
    })
    status: WebhookVideoStatus;

    @Column({ default: false })
    isPrivate: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @OneToMany(() => SharedVideo, (sharedVideo) => sharedVideo.video)
    sharedWith: SharedVideo[];

    @OneToMany(() => Comment, (comment) => comment.video)
    comments: Comment[];
}