export type GameStatus = 'completed' | 'playing' | 'planned' | 'dropped';

export interface Game {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  status: GameStatus;
  created_at: string;
  screenshot_count?: number;
}

export interface Screenshot {
  id: string;
  game_id: string;
  storage_path: string;
  public_url: string;
  caption: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  created_at: string;
  media_type: 'image' | 'video';
}

export interface GameSave {
  id: string;
  game_id: string;
  file_name: string;
  file_url: string;
  storage_path: string;
  description: string;
  file_size: number | null;
  created_at: string;
}

export interface BacklogItem {
  id: string;
  title: string;
  status: GameStatus;
  note: string;
  created_at: string;
}

export interface UploadProgress {
  file: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
}
