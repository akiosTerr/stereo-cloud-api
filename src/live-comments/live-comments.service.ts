import { Injectable, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LiveCommentPayload } from './live-comment.interface';

@Injectable()
export class LiveCommentsService {
  private readonly store = new Map<string, LiveCommentPayload[]>();

  getComments(videoId: string): LiveCommentPayload[] {
    const comments = this.store.get(videoId) ?? [];
    return [...comments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  addComment(
    videoId: string,
    userId: string,
    user: { id: string; name: string; channel_name: string; email: string },
    content: string,
  ): LiveCommentPayload {
    const trimmed = content?.trim() || '';
    if (!trimmed) {
      throw new BadRequestException('Comment content cannot be empty');
    }
    if (trimmed.length > 1000) {
      throw new BadRequestException('Comment content must not exceed 1000 characters');
    }

    const now = new Date().toISOString();
    const comment: LiveCommentPayload = {
      id: randomUUID(),
      video_id: videoId,
      user_id: userId,
      content: trimmed,
      created_at: now,
      updated_at: now,
      user: {
        id: user.id,
        name: user.name,
        channel_name: user.channel_name,
        email: user.email,
      },
    };

    const list = this.store.get(videoId) ?? [];
    list.push(comment);
    this.store.set(videoId, list);
    return comment;
  }

  deleteComment(videoId: string, commentId: string, userId: string): boolean {
    const list = this.store.get(videoId) ?? [];
    const idx = list.findIndex((c) => c.id === commentId && c.user_id === userId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this.store.set(videoId, list);
    return true;
  }
}
