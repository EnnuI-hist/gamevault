'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Edit2, Check, Trash2, Loader2 } from 'lucide-react';
import { downloadFile } from '@/lib/utils';
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

  const prev = useCallback(() => setIndex((i) => (i > 0 ? i - 1 : screenshots.length - 1)), [screenshots.length]);
  const next = useCallback(() => setIndex((i) => (i < screenshots.length - 1 ? i + 1 : 0)), [screenshots.length]);

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
      const ext = current.storage_path.split('.').pop() || 'jpg';
      const filename = current.caption
        ? `${current.caption.slice(0, 30).trim().replace(/[\\/:*?"<>|]/g, '_')}.${ext}`
        : current.storage_path.split('/').pop() || `screenshot-${current.id.slice(0, 8)}.${ext}`;
      await downloadFile(current.public_url, filename);
    } catch (err) {
      console.error('Ошибка скачивания оригинала:', err);
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
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            title="Скачать файл на диск в максимальном качестве"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 size={13} className="animate-spin text-indigo-400" />
            ) : (
              <Download size={13} />
            )}
            {downloading ? 'Загрузка...' : 'Скачать оригинал'}
          </button>
          {isOwner && (
            <button
              onClick={() => onDelete(current)}
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 transition hover:bg-red-500/20"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Изображение */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.public_url}
          alt={current.caption || `Скриншот ${index + 1}`}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />

        {/* Стрелка назад */}
        <button
          onClick={prev}
          className="absolute left-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/60 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Стрелка вперёд */}
        <button
          onClick={next}
          className="absolute right-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/60 backdrop-blur-sm transition hover:bg-black/70 hover:text-white"
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
              className="flex-1 rounded-lg border border-indigo-500/40 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500"
            />
            <button onClick={saveCaption} className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-500">
              <Check size={16} />
            </button>
            <button onClick={() => setEditingCaption(false)} className="rounded-lg bg-white/10 p-2 text-white/60 hover:bg-white/20">
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
