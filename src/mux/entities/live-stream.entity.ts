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

export enum LiveStreamStatus {
    IDLE = 'idle',
    ACTIVE = 'active',
    COMPLETED = 'completed',
}

@Entity('live_streams')
export class LiveStream {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    live_stream_id: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ nullable: true })
    title?: string;

    @Column({ default: false })
    isPrivate: boolean;

    @Column()
    stream_key: string;

    @Column({
        type: 'text',
        default: LiveStreamStatus.IDLE,
    })
    status: LiveStreamStatus;

    @Column()
    playback_id: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
