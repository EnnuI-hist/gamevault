export interface Game {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
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
}

export interface UploadProgress {
  file: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
}
