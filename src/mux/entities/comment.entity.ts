import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Video } from './video.entity';
import { User } from '../../users/entities/user.entity';

@Entity('comments')
export class Comment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    video_id: string;

    @ManyToOne(() => Video, (video) => video.comments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'video_id' })
    video: Video;

    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'text' })
    content: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
