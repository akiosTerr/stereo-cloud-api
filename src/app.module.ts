import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MuxModule } from './mux/mux.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Video } from './mux/entities/video.entity';
import { UsersModule } from './users/users.module';
import { User } from './users/entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [User, Video],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Video]),
    MuxModule,
    UsersModule,
    AuthModule,
    WebhooksModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
