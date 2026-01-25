import { Module } from '@nestjs/common';
import { MuxService } from './mux.service';
import { MuxController } from './mux.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from './entities/video.entity';
import { UsersModule } from 'src/users/users.module';
@Module({
  imports: [TypeOrmModule.forFeature([Video]), UsersModule],
  controllers: [MuxController],
  providers: [MuxService],
  exports: [MuxService]
})
export class MuxModule {}
