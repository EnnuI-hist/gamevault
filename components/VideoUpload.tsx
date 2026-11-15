'use client';

import { useState, useRef } from 'react';
import { Video, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatFileSize } from '@/lib/utils';

interface VideoUploadProps {
  gameId: string;
  onUploaded: () => void;
}

interface VideoProgress {
  filename: string;
  percent: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
}

/** Генерирует URL превью из Cloudinary URL видео */
export function cloudinaryThumb(videoUrl: string): string {
  // https://res.cloudinary.com/<cloud>/video/upload/<public_id>.mp4
  // → https://res.cloudinary.com/<cloud>/video/upload/so_0/<public_id>.jpg
  return videoUrl
    .replace('/video/upload/', '/video/upload/so_0/')
    .replace(/\.(mp4|webm|mov)(\?.*)?$/i, '.jpg');
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

export default function VideoUpload({ gameId, onUploaded }: VideoUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<VideoProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const uploadVideo = (file: File, index: number): Promise<void> => {
    return new Promise((resolve) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 90);
          setUploads((prev) =>
            prev.map((u, i) => i === index ? { ...u, percent } : u)
          );
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as {
              secure_url: string;
              public_id: string;
              bytes: number;
            };

            setUploads((prev) =>
              prev.map((u, i) => i === index ? { ...u, percent: 95 } : u)
            );

            const { error: dbErr } = await supabase.from('screenshots').insert({
              game_id: gameId,
              storage_path: data.public_id,
              public_url: data.secure_url,
              caption: '',
              size_bytes: data.bytes,
              media_type: 'video',
            });

            if (dbErr) throw dbErr;

            setUploads((prev) =>
              prev.map((u, i) => i === index ? { ...u, percent: 100, status: 'done' } : u)
            );
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Ошибка записи в БД';
            setUploads((prev) =>
              prev.map((u, i) => i === index ? { ...u, status: 'error', error: msg } : u)
            );
          }
        } else {
          setUploads((prev) =>
            prev.map((u, i) => i === index ? { ...u, status: 'error', error: `HTTP ${xhr.status}` } : u)
          );
        }
        resolve();
      };

      xhr.onerror = () => {
        setUploads((prev) =>
          prev.map((u, i) => i === index ? { ...u, status: 'error', error: 'Сетевая ошибка' } : u)
        );
        resolve();
      };

      xhr.open('POST', UPLOAD_URL);
      xhr.send(formData);
    });
  };

  const handleFiles = async (files: File[]) => {
    if (isUploading) return;
    const videoFiles = files.filter((f) =>
      f.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(f.name)
    );
    if (!videoFiles.length) return;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      alert('Cloudinary не настроен. Укажите NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME и NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET в .env.local');
      return;
    }

    setIsUploading(true);
    setUploads(videoFiles.map((f) => ({
      filename: f.name,
      percent: 0,
      status: 'uploading',
    })));

    // Загружаем последовательно (видео тяжёлые)
    for (let i = 0; i < videoFiles.length; i++) {
      await uploadVideo(videoFiles[i], i);
    }

    setIsUploading(false);
    onUploaded();
    setTimeout(() => setUploads([]), 4000);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div className="mb-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-all duration-200 ${
          isDragOver
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-white/10 bg-white/[0.015] hover:border-violet-500/40 hover:bg-white/[0.03]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
        />
        <Video size={28} className={isDragOver ? 'text-violet-400' : 'text-white/25'} />
        <div className="text-center">
          <p className="text-sm font-medium text-white/50">
            Добавить видео (MP4 / WebM / MOV)
          </p>
          <p className="mt-0.5 text-xs text-white/25">
            Загрузка через Cloudinary — без ограничений по весу
          </p>
        </div>
      </div>

      {uploads.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploads.map((u, i) => (
            <div key={i} className="rounded-lg bg-white/5 px-3 py-2">
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="truncate text-xs text-white/60">{u.filename}</span>
                {u.status === 'error' && <AlertCircle size={12} className="shrink-0 text-red-400" />}
                {u.status === 'done' && <span className="text-xs text-green-400">✓</span>}
                {u.status === 'uploading' && <Loader2 size={12} className="shrink-0 animate-spin text-violet-400" />}
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    u.status === 'error' ? 'bg-red-500' :
                    u.status === 'done' ? 'bg-green-500' : 'bg-violet-500'
                  }`}
                  style={{ width: `${u.percent}%` }}
                />
              </div>
              {u.status === 'uploading' && (
                <p className="mt-0.5 text-[10px] text-white/40">
                  {u.percent < 90
                    ? `Загрузка: ${u.percent}%`
                    : 'Сохранение...'}
                </p>
              )}
              {u.status === 'error' && u.error && (
                <p className="mt-0.5 text-[10px] text-red-400">{u.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
