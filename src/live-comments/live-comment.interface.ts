export interface LiveCommentPayload {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    channel_name: string;
    email: string;
  };
}
