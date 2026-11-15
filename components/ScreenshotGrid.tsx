'use client';

import { useState, useCallback } from 'react';
import { Loader2, Trash2, Download, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useInfiniteScroll } from '@/lib/hooks/useInfiniteScroll';
import { downloadFile, resolveMediaUrl } from '@/lib/utils';
import { playClick, playHover } from '@/lib/sounds';
import Lightbox from './Lightbox';
import { cloudinaryThumb } from './VideoUpload';
import type { Screenshot } from '@/lib/types';

const PAGE_SIZE = 30;

interface ScreenshotGridProps {
  gameId: string;
  isOwner: boolean;
  initialScreenshots: Screenshot[];
  initialHasMore: boolean;
}

export default function ScreenshotGrid({
  gameId,
  isOwner,
  initialScreenshots,
  initialHasMore,
}: ScreenshotGridProps) {
  const [screenshots, setScreenshots] = useState<Screenshot[]>(initialScreenshots);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const supabase = createClient();

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const { data } = await supabase
      .from('screenshots')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .range(screenshots.length, screenshots.length + PAGE_SIZE - 1);

    if (data) {
      setScreenshots((prev) => [...prev, ...(data as Screenshot[])]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [loading, hasMore, screenshots.length, gameId, supabase]);

  const sentinelRef = useInfiniteScroll(loadMore, hasMore);

  const handleDelete = async (screenshot: Screenshot) => {
    if (!confirm('Удалить?')) return;
    playClick();
    // Удаляем из Supabase Storage только изображения; видео (Cloudinary) не трогаем
    if (screenshot.media_type !== 'video') {
      await supabase.storage.from('screenshots').remove([screenshot.storage_path]);
    }
    await supabase.from('screenshots').delete().eq('id', screenshot.id);
    setScreenshots((prev) => prev.filter((s) => s.id !== screenshot.id));
    if (lightboxIndex !== null) setLightboxIndex(null);
  };

  const handleCaptionUpdate = async (id: string, caption: string) => {
    await supabase.from('screenshots').update({ caption }).eq('id', id);
    setScreenshots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, caption } : s))
    );
  };

  const handleQuickDownload = async (e: React.MouseEvent, shot: Screenshot) => {
    e.stopPropagation();
    if (downloadingId === shot.id) return;
    playClick();
    try {
      setDownloadingId(shot.id);
      const ext = shot.storage_path.split('.').pop() || (shot.media_type === 'video' ? 'mp4' : 'webp');
      const filename = shot.caption
        ? `${shot.caption.slice(0, 30).trim().replace(/[\\/:*?"<>|]/g, '_')}.${ext}`
        : shot.storage_path.split('/').pop() || `file-${shot.id.slice(0, 8)}.${ext}`;
      await downloadFile(resolveMediaUrl(shot.public_url), filename);
    } catch (err) {
      console.error('Ошибка быстрого скачивания:', err);
      alert('Не удалось скачать файл');
    } finally {
      setDownloadingId(null);
    }
  };

  if (screenshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-5xl mb-4">📸</div>
        <p className="text-white/40">Скриншотов пока нет</p>
        {isOwner && (
          <p className="mt-2 text-sm text-white/30">
            Перетащи файлы в зону загрузки выше
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3">
        {screenshots.map((shot, idx) => {
          const isVideo = shot.media_type === 'video';
          const resolvedUrl = resolveMediaUrl(shot.public_url);
          const thumbSrc = isVideo ? cloudinaryThumb(shot.public_url) : resolvedUrl;

          return (
            <div
              key={shot.id}
              className="group relative break-inside-avoid overflow-hidden rounded-lg border border-white/5 bg-[#131720] cursor-zoom-in"
              onClick={() => {
                playClick();
                setLightboxIndex(idx);
              }}
              onMouseEnter={playHover}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbSrc}
                alt={shot.caption || `Медиа ${idx + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.02]"
              />

              {/* Play badge для видео */}
              {isVideo && (
                <>
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/70 backdrop-blur-sm border border-white/20 shadow-xl">
                      <Play size={22} className="text-white ml-1" />
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm">
                    Видео
                  </div>
                </>
              )}

              {/* Hover overlay с подписью */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none">
                {shot.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-xs text-white/90 line-clamp-2">{shot.caption}</p>
                  </div>
                )}
              </div>

              {/* Кнопки действий при наведении (Лаунчерный стеклянный стиль) */}
              <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <button
                  title={isVideo ? 'Скачать видео' : 'Скачать оригинал'}
                  onClick={(e) => handleQuickDownload(e, shot)}
                  disabled={downloadingId === shot.id}
                  className="flex items-center justify-center rounded-xl border border-white/15 bg-[#0d111a]/80 backdrop-blur-md p-2 text-white/80 shadow-lg transition-all duration-200 hover:border-[var(--neon-border)] hover:bg-[var(--neon-badge-bg)] hover:text-[var(--neon-text)] hover:shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.35)] active:scale-95 disabled:opacity-50"
                >
                  {downloadingId === shot.id ? (
                    <Loader2 size={14} className="animate-spin text-[var(--neon-text)]" />
                  ) : (
                    <Download size={14} />
                  )}
                </button>

                {isOwner && (
                  <button
                    title="Удалить"
                    onClick={(e) => { e.stopPropagation(); handleDelete(shot); }}
                    className="flex items-center justify-center rounded-xl border border-white/15 bg-[#0d111a]/80 backdrop-blur-md p-2 text-white/80 shadow-lg transition-all duration-200 hover:border-red-500/60 hover:bg-red-500/20 hover:text-red-300 hover:shadow-[0_0_12px_rgba(239,68,68,0.35)] active:scale-95"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="mt-6 flex justify-center">
        {loading && <Loader2 size={24} className="animate-spin text-white/30" />}
        {!hasMore && screenshots.length > PAGE_SIZE && (
          <p className="text-sm text-white/20">Все медиафайлы загружены</p>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          screenshots={screenshots}
          initialIndex={lightboxIndex}
          isOwner={isOwner}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleDelete}
          onCaptionUpdate={handleCaptionUpdate}
        />
      )}
    </>
  );
}
