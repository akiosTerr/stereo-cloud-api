import { Module } from '@nestjs/common';
import { MuxService } from './mux.service';
import { MuxController } from './mux.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from './entities/video.entity';
import { SharedVideo } from './entities/shared-video.entity';
import { Comment } from './entities/comment.entity';
import { LiveStream } from './entities/live-stream.entity';
import { UsersModule } from 'src/users/users.module';
@Module({
  imports: [TypeOrmModule.forFeature([Video, SharedVideo, Comment, LiveStream]), UsersModule],
  controllers: [MuxController],
  providers: [MuxService],
  exports: [MuxService]
})
export class MuxModule {}
