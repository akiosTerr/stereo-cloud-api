import { Module } from '@nestjs/common';
import { LiveCommentsService } from './live-comments.service';
import { LiveCommentsController } from './live-comments.controller';
import { LiveCommentsGateway } from './live-comments.gateway';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [LiveCommentsController],
  providers: [LiveCommentsService, LiveCommentsGateway],
})
export class LiveCommentsModule {}
