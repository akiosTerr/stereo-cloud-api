import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
  } from 'typeorm';
  import { Video } from '../../mux/entities/video.entity';
  import { SharedVideo } from '../../mux/entities/shared-video.entity';
import { Exclude } from 'class-transformer';
  
  @Entity('users')
  export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ unique: true })
    email: string;

    @Column({ unique: true})
    channel_name: string;

    @Column()
    name: string;

    @Column()
    @Exclude() 
    password: string;
  
    @CreateDateColumn()
    created_at: Date;
  
    @UpdateDateColumn()
    updated_at: Date;
  
    @OneToMany(() => Video, (video) => video.user)
    videos: Video[];

    @OneToMany(() => SharedVideo, (sharedVideo) => sharedVideo.sharedWithUser)
    sharedVideos: SharedVideo[];
  }