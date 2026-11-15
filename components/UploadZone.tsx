'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { UploadCloud, X, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ProgressBar from './ProgressBar';
import type { UploadProgress } from '@/lib/types';

interface UploadZoneProps {
  gameId: string;
  gameSlug: string;
  onUploaded: () => void;
}

export default function UploadZone({ gameId, gameSlug, onUploaded }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+V: вставка из буфера обмена
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItems = items.filter((i) => i.type.startsWith('image/'));
      if (imageItems.length === 0) return;
      const files = imageItems.map((i) => i.getAsFile()).filter(Boolean) as File[];
      handleFiles(files);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [gameId, gameSlug]);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length || isUploading) return;

    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    const initialProgress: UploadProgress[] = imageFiles.map((f) => ({
      file: f.name,
      progress: 0,
      status: 'pending',
    }));
    setUploads(initialProgress);
    setIsUploading(true);

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${gameSlug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      setUploads((prev) =>
        prev.map((u, idx) => idx === i ? { ...u, status: 'uploading', progress: 20 } : u)
      );

      try {
        const { error: upErr } = await supabase.storage
          .from('screenshots')
          .upload(path, file, { cacheControl: '3600' });

        if (upErr) throw upErr;

        setUploads((prev) =>
          prev.map((u, idx) => idx === i ? { ...u, progress: 70 } : u)
        );

        const { data: { publicUrl } } = supabase.storage
          .from('screenshots')
          .getPublicUrl(path);

        const { error: dbErr } = await supabase.from('screenshots').insert({
          game_id: gameId,
          storage_path: path,
          public_url: publicUrl,
          caption: '',
          size_bytes: file.size,
        });

        if (dbErr) throw dbErr;

        setUploads((prev) =>
          prev.map((u, idx) => idx === i ? { ...u, progress: 100, status: 'done' } : u)
        );
      } catch {
        setUploads((prev) =>
          prev.map((u, idx) => idx === i ? { ...u, status: 'error', progress: 0 } : u)
        );
      }
    }

    setIsUploading(false);
    onUploaded();

    setTimeout(() => setUploads([]), 2000);
  }, [gameId, gameSlug, isUploading, onUploaded, supabase]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const hasErrors = uploads.some((u) => u.status === 'error');

  return (
    <div className="mb-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all duration-200 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-white/15 bg-white/[0.02] hover:border-indigo-500/50 hover:bg-white/5'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
        />
        <UploadCloud size={32} className={isDragOver ? 'text-indigo-400' : 'text-white/30'} />
        <div className="text-center">
          <p className="text-sm font-medium text-white/60">
            Перетащи файлы или нажми для выбора
          </p>
          <p className="mt-1 text-xs text-white/30">
            Также работает Ctrl+V для вставки из буфера обмена
          </p>
        </div>
      </div>

      {/* Прогресс загрузки */}
      {uploads.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="truncate text-xs text-white/60">{u.file}</span>
                  {u.status === 'error' && <AlertCircle size={12} className="shrink-0 text-red-400" />}
                  {u.status === 'done' && <span className="text-xs text-green-400">✓</span>}
                </div>
                <ProgressBar progress={u.progress} status={u.status} />
              </div>
            </div>
          ))}
          {hasErrors && (
            <p className="text-xs text-red-400">Некоторые файлы не удалось загрузить</p>
          )}
        </div>
      )}
    </div>
  );
}
