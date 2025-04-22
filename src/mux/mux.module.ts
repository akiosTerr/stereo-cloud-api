import { Module } from '@nestjs/common';
import { MuxService } from './mux.service';
import { MuxController } from './mux.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from './entities/video.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Video])],
  controllers: [MuxController],
  providers: [MuxService],
  exports: [MuxService]
})
export class MuxModule {}
