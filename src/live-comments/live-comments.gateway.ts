import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { LiveCommentsService } from './live-comments.service';
import { LiveCommentPayload } from './live-comment.interface';

const ROOM_PREFIX = 'video:';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/live-comments',
})
export class LiveCommentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly liveCommentsService: LiveCommentsService) {}

  handleConnection() {
    // client can join room via subscribeMessage
  }

  handleDisconnect() {
    // no need to leave room explicitly
  }

  @SubscribeMessage('join-video')
  handleJoinVideo(client: { id: string; join: (room: string) => void }, payload: { videoId: string }) {
    const videoId = payload?.videoId;
    if (videoId && typeof videoId === 'string') {
      client.join(ROOM_PREFIX + videoId);
    }
  }

  broadcastNewComment(videoId: string, comment: LiveCommentPayload): void {
    this.server.to(ROOM_PREFIX + videoId).emit('new-comment', comment);
  }

  broadcastCommentDeleted(videoId: string, commentId: string): void {
    this.server.to(ROOM_PREFIX + videoId).emit('comment-deleted', { commentId });
  }
}
