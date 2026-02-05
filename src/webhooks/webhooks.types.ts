export enum WebhookStreamStatus {
  LIVE_STREAM_IDLE = 'video.live_stream.idle',
  LIVE_STREAM_ACTIVE = 'video.live_stream.active',
  LIVE_STREAM_COMPLETED = 'video.asset.live_stream_completed',
}

export enum WebhookVideoStatus {
  CREATED = 'video.asset.created',
  READY = 'video.asset.ready',
}

export type MuxBodyWebHook = {
  type: WebhookStreamStatus | WebhookVideoStatus;
  data: {
    id: string;
    upload_id: string;
    duration: number;
    meta: {
      title?: string;
      creator_id: string;
    };
    playback_ids: [{ id: string; policy: string }];
    live_stream_id?: string;
  };
};
