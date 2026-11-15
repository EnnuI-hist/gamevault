'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ProgressBar from './ProgressBar';
import { formatFileSize } from '@/lib/utils';
import type { UploadProgress } from '@/lib/types';

interface UploadZoneProps {
  gameId: string;
  gameSlug: string;
  onUploaded: () => void;
}

interface CompressResult {
  file: File;
  originalSize: number;
  newSize: number;
  compressed: boolean;
}

/** Конвертирует изображение в WebP через canvas */
async function compressToWebP(file: File): Promise<CompressResult> {
  // WebP не сжимаем повторно — только PNG/JPG/BMP
  if (!file.type.startsWith('image/') || file.type === 'image/webp') {
    return { file, originalSize: file.size, newSize: file.size, compressed: false };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Если WebP крупнее — оставляем оригинал
            resolve({ file, originalSize: file.size, newSize: file.size, compressed: false });
            return;
          }
          const newName = file.name.replace(/\.[^.]+$/, '.webp');
          const webpFile = new File([blob], newName, { type: 'image/webp' });
          resolve({ file: webpFile, originalSize: file.size, newSize: blob.size, compressed: true });
        },
        'image/webp',
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ file, originalSize: file.size, newSize: file.size, compressed: false });
    };
    img.src = url;
  });
}

export default function UploadZone({ gameId, gameSlug, onUploaded }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploads, setUploads] = useState<(UploadProgress & { savings?: string })[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploadingRef = useRef(false);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, gameSlug]);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length || isUploadingRef.current) return;

    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (!imageFiles.length) return;

    isUploadingRef.current = true;
    setIsUploading(true);

    const initialProgress = imageFiles.map((f) => ({
      file: f.name,
      progress: 0,
      status: 'pending' as const,
    }));
    setUploads(initialProgress);

    for (let i = 0; i < imageFiles.length; i++) {
      const original = imageFiles[i];

      setUploads((prev) =>
        prev.map((u, idx) => idx === i ? { ...u, status: 'uploading', progress: 5, savings: 'Сжатие...' } : u)
      );

      // Сжимаем в WebP
      const { file, originalSize, newSize, compressed } = await compressToWebP(original);
      const savings = compressed
        ? `Сжато: ${formatFileSize(originalSize)} → ${formatFileSize(newSize)}`
        : undefined;

      const ext = file.name.split('.').pop() ?? 'webp';
      const path = `${gameSlug}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      setUploads((prev) =>
        prev.map((u, idx) => idx === i ? { ...u, progress: 20, savings } : u)
      );

      try {
        const { error: upErr } = await supabase.storage
          .from('screenshots')
          .upload(path, file, { cacheControl: '3600', contentType: file.type });

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
          size_bytes: newSize,
          media_type: 'image',
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

    isUploadingRef.current = false;
    setIsUploading(false);
    onUploaded();
    setTimeout(() => setUploads([]), 3000);
  }, [gameId, gameSlug, onUploaded, supabase]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const hasErrors = uploads.some((u) => u.status === 'error');

  return (
    <div className="mb-4">
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
            PNG/JPG → WebP автоматически · Ctrl+V для вставки из буфера
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
                {u.savings && (
                  <p className="mt-1 text-[10px] text-emerald-400">{u.savings}</p>
                )}
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
