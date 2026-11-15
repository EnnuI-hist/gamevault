'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Upload, Loader2, Check, AlertCircle, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import type { Game } from '@/lib/types';

interface EditGameModalProps {
  game: Game;
  onClose: () => void;
  onUpdated: (updatedGame: Game) => void;
}

/** Конвертирует изображение в WebP через Canvas с качеством 0.92 */
async function compressToWebP(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/webp') {
      resolve(file);
      return;
    }
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) resolve(blob);
          else resolve(file);
        },
        'image/webp',
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export default function EditGameModal({
  game,
  onClose,
  onUpdated,
}: EditGameModalProps) {
  const [title, setTitle] = useState(game.title);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(game.cover_url || '');
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Вставка из буфера через Ctrl + V
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((i) => i.type.startsWith('image/'));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) handleFile(file);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите файл изображения');
      return;
    }
    setError('');
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;

    setLoading(true);
    setError('');

    try {
      let finalCoverUrl = game.cover_url;

      // 1. Если загружен новый файл обложки
      if (coverFile) {
        const compressedBlob = await compressToWebP(coverFile);
        const newPath = `covers/${slugify(cleanTitle)}-${Date.now()}.webp`;

        const { error: upErr } = await supabase.storage
          .from('screenshots')
          .upload(newPath, compressedBlob, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/webp',
          });

        if (upErr) throw upErr;

        const {
          data: { publicUrl },
        } = supabase.storage.from('screenshots').getPublicUrl(newPath);

        finalCoverUrl = publicUrl;

        // 2. Очистка старого файла из Storage (если он лежал в нашем бакете screenshots)
        if (game.cover_url && game.cover_url.includes('/screenshots/')) {
          try {
            const parts = game.cover_url.split('/screenshots/');
            if (parts[1]) {
              const oldPath = decodeURIComponent(parts[1].split('?')[0]);
              await supabase.storage.from('screenshots').remove([oldPath]);
            }
          } catch (delErr) {
            console.warn('Не удалось удалить старую обложку из хранилища:', delErr);
          }
        }
      }

      // 3. Обновляем запись в таблице games
      const updates = {
        title: cleanTitle,
        cover_url: finalCoverUrl,
      };

      const { error: dbErr } = await supabase
        .from('games')
        .update(updates)
        .eq('id', game.id);

      if (dbErr) throw dbErr;

      // 4. Оповещаем родительский компонент
      const updated: Game = {
        ...game,
        title: cleanTitle,
        cover_url: finalCoverUrl,
      };

      onUpdated(updated);
      onClose();
    } catch (err) {
      console.error('Ошибка редактирования игры:', err);
      setError(err instanceof Error ? err.message : 'Не удалось сохранить изменения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => !loading && e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#131720] p-6 shadow-2xl">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
        >
          <X size={18} />
        </button>

        <h2 className="mb-5 text-xl font-bold text-white">Редактировать игру</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Название игры */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Название игры
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Название игры"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition neon-ring-focus focus:bg-white/10"
            />
          </div>

          {/* Обложка */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Обложка игры
            </label>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            {/* Зона Drag & Drop / клика / превью */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              onClick={() => !loading && fileRef.current?.click()}
              className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-4 transition-all ${
                isDragOver
                  ? 'border-[var(--neon-primary)] bg-[var(--neon-badge-bg)]'
                  : 'border-white/15 bg-white/[0.02] hover:border-[var(--neon-primary)] hover:bg-white/5'
              }`}
            >
              {coverPreview ? (
                <div className="flex items-center gap-4 w-full">
                  <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-md">
                    <Image
                      src={coverPreview}
                      alt="Превью обложки"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-semibold text-white">
                      {coverFile ? 'Новая выбранная обложка' : 'Текущая обложка'}
                    </p>
                    <p className="mt-1 text-[11px] text-white/40 leading-relaxed">
                      Нажмите или перетащите файл, чтобы заменить (поддерживается Ctrl+V)
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-md neon-badge px-2 py-0.5 text-[10px] font-medium">
                      Заменить обложку
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Upload size={26} className="text-white/30 mb-2" />
                  <p className="text-xs font-medium text-white/70">
                    Перетащите обложку сюда или нажмите для выбора
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/30">
                    Поддерживается Ctrl + V из буфера • автосжатие в WebP
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs sm:text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-medium text-white transition disabled:opacity-50 neon-btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <Check size={15} />
                  <span>Сохранить изменения</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
