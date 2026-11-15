'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Edit2, Check, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { downloadFile, resolveMediaUrl } from '@/lib/utils';
import { parseVideoUrl } from '@/lib/videoUtils';
import { playSwipe, playClick, playHover } from '@/lib/sounds';
import type { Screenshot } from '@/lib/types';

interface LightboxProps {
  screenshots: Screenshot[];
  initialIndex: number;
  isOwner: boolean;
  onClose: () => void;
  onDelete: (s: Screenshot) => void;
  onCaptionUpdate: (id: string, caption: string) => void;
}

export default function Lightbox({
  screenshots,
  initialIndex,
  isOwner,
  onClose,
  onDelete,
  onCaptionUpdate,
}: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [downloading, setDownloading] = useState(false);

  const current = screenshots[index];
  const isVideo = current?.media_type === 'video';
  const resolvedUrl = resolveMediaUrl(current?.public_url);

  const parsedVideo = useMemo(() => {
    if (!isVideo || !current?.public_url) return null;
    return parseVideoUrl(current.public_url);
  }, [isVideo, current?.public_url]);

  const isIframeVideo =
    parsedVideo &&
    (parsedVideo.provider === 'youtube' ||
      parsedVideo.provider === 'drive' ||
      parsedVideo.provider === 'rutube');

  const prev = useCallback(() => {
    playSwipe();
    setIndex((i) => (i > 0 ? i - 1 : screenshots.length - 1));
  }, [screenshots.length]);

  const next = useCallback(() => {
    playSwipe();
    setIndex((i) => (i < screenshots.length - 1 ? i + 1 : 0));
  }, [screenshots.length]);

  useEffect(() => {
    setCaptionDraft(current?.caption ?? '');
    setEditingCaption(false);
  }, [index, current?.caption]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingCaption) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next, editingCaption]);

  // Блокируем скролл страницы
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const saveCaption = () => {
    onCaptionUpdate(current.id, captionDraft);
    setEditingCaption(false);
  };

  const handleDownload = async () => {
    if (downloading || !current) return;
    setDownloading(true);
    try {
      const ext = isVideo
        ? (current.public_url.match(/\.(mp4|webm|mov)/i)?.[1] ?? 'mp4')
        : (current.storage_path.split('.').pop() || 'webp');
      const filename = current.caption
        ? `${current.caption.slice(0, 30).trim().replace(/[\\/:*?"<>|]/g, '_')}.${ext}`
        : current.storage_path.split('/').pop() || `file-${current.id.slice(0, 8)}.${ext}`;
      await downloadFile(resolvedUrl, filename);
    } catch (err) {
      console.error('Ошибка скачивания:', err);
      alert('Не удалось скачать файл');
    } finally {
      setDownloading(false);
    }
  };

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Верхняя панель */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm text-white/50">
          {index + 1} / {screenshots.length}
          {isVideo && (
            <span className="ml-2 rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
              Видео
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {isIframeVideo ? (
            <a
              href={current.public_url}
              target="_blank"
              rel="noreferrer"
              onMouseEnter={playHover}
              title={`Открыть оригинал (${parsedVideo?.platformName})`}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0d111a]/80 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-white/80 transition-all duration-200 hover:border-violet-500/50 hover:bg-violet-500/20 hover:text-white hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] active:scale-95"
            >
              <ExternalLink size={13} />
              <span>Открыть в новой вкладке</span>
            </a>
          ) : (
            <button
              onClick={handleDownload}
              onMouseEnter={playHover}
              disabled={downloading}
              title={isVideo ? 'Скачать видео' : 'Скачать файл на диск в максимальном качестве'}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#0d111a]/80 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-white/80 transition-all duration-200 hover:border-[var(--neon-border)] hover:bg-[var(--neon-badge-bg)] hover:text-[var(--neon-text)] hover:shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.3)] active:scale-95 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 size={13} className="animate-spin text-[var(--neon-text)]" />
              ) : (
                <Download size={13} />
              )}
              <span>{downloading ? 'Загрузка...' : isVideo ? 'Скачать видео' : 'Скачать оригинал'}</span>
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => {
                playClick();
                onDelete(current);
              }}
              onMouseEnter={playHover}
              className="rounded-xl border border-red-500/40 bg-red-500/10 p-2 text-red-400 transition-all duration-200 hover:border-red-500/70 hover:bg-red-500/20 hover:text-red-300 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)] active:scale-95"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            onMouseEnter={playHover}
            className="rounded-xl border border-white/15 bg-white/5 p-2 text-white/60 transition-all duration-200 hover:border-white/30 hover:bg-white/10 hover:text-white active:scale-95"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Медиаконтент */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-12">
        {isVideo ? (
          isIframeVideo ? (
            <div className="w-full max-w-5xl aspect-video max-h-[80vh] flex items-center justify-center">
              <iframe
                key={current.id}
                src={parsedVideo.embedUrl}
                title={current.caption || `${parsedVideo.platformName} видео`}
                className="w-full h-full rounded-2xl shadow-2xl border border-white/10"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : (
            // HTML5 видеоплеер для прямых ссылок
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              key={current.id}
              src={resolvedUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl border border-white/10"
            />
          )
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedUrl}
            alt={current.caption || `Скриншот ${index + 1}`}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        )}

        {/* Стрелка назад */}
        <button
          onClick={prev}
          onMouseEnter={playHover}
          className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/60 backdrop-blur-sm transition hover:bg-black/70 hover:text-white cursor-pointer"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Стрелка вперёд */}
        <button
          onClick={next}
          onMouseEnter={playHover}
          className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/60 backdrop-blur-sm transition hover:bg-black/70 hover:text-white cursor-pointer"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Нижняя панель — подпись */}
      <div className="shrink-0 border-t border-white/10 px-4 py-3">
        {editingCaption ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={captionDraft}
              onChange={(e) => setCaptionDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveCaption(); if (e.key === 'Escape') setEditingCaption(false); }}
              placeholder="Добавь описание момента..."
              className="flex-1 rounded-lg border border-[var(--neon-badge-border)] bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none neon-ring-focus"
            />
            <button onClick={saveCaption} className="rounded-xl p-2 text-white neon-btn-primary active:scale-95 shadow-md">
              <Check size={16} />
            </button>
            <button onClick={() => setEditingCaption(false)} className="rounded-xl border border-white/10 bg-white/10 p-2 text-white/60 hover:bg-white/20 hover:text-white active:scale-95 transition-all">
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-h-[36px]">
            <p className="flex-1 text-sm text-white/60">
              {current.caption || <span className="text-white/25 italic">Нет описания</span>}
            </p>
            {isOwner && (
              <button
                onClick={() => setEditingCaption(true)}
                className="shrink-0 rounded-lg p-1.5 text-white/30 transition hover:bg-white/10 hover:text-white/70"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
