import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { Video } from './video.entity';
import { User } from '../../users/entities/user.entity';

@Entity('shared_videos')
@Unique(['video_id', 'shared_with_user_id'])
export class SharedVideo {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    video_id: string;

    @ManyToOne(() => Video, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'video_id' })
    video: Video;

    @Column({ type: 'uuid' })
    shared_with_user_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shared_with_user_id' })
    sharedWithUser: User;

    @Column({ type: 'uuid' })
    shared_by_user_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shared_by_user_id' })
    sharedByUser: User;

    @CreateDateColumn()
    created_at: Date;
}
