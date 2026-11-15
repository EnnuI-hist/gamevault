'use client';

import { useState } from 'react';
import { Play, Plus, Film, Trash2, Pencil, Check, X, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { parseVideoUrl } from '@/lib/videoUtils';
import { playClick, playHover } from '@/lib/sounds';
import Lightbox from './Lightbox';
import VideoLinkModal from './VideoLinkModal';
import type { Screenshot } from '@/lib/types';

interface VideoSectionProps {
  gameId: string;
  isOwner: boolean;
  videos: Screenshot[];
  onRefresh: () => void;
}

export default function VideoSection({
  gameId,
  isOwner,
  videos,
  onRefresh,
}: VideoSectionProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const supabase = createClient();

  const startEdit = (video: Screenshot, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(video.id);
    setEditCaption(video.caption || '');
  };

  const saveCaption = async (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    try {
      await supabase.from('screenshots').update({ caption: editCaption.trim() }).eq('id', id);
      setEditingId(null);
      onRefresh();
    } catch (err) {
      console.error('Ошибка обновления подписи:', err);
    }
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDeleteVideo = async (video: Screenshot, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Удалить это видео?')) return;
    playClick();

    try {
      const { error } = await supabase.from('screenshots').delete().eq('id', video.id);
      if (error) throw error;
      onRefresh();
      if (lightboxIndex !== null) setLightboxIndex(null);
    } catch (err) {
      console.error('Ошибка удаления видео:', err);
      alert('Не удалось удалить видео');
    }
  };

  const handleLightboxCaptionUpdate = async (id: string, caption: string) => {
    await supabase.from('screenshots').update({ caption }).eq('id', id);
    onRefresh();
  };

  return (
    <div>
      {/* Верхняя панель управления */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Видеоролики</span>
            <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 font-mono text-xs text-violet-300">
              {videos.length}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-white/40">
            Откаты, прохождения и яркие моменты игры
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={() => {
              playClick();
              setShowAddModal(true);
            }}
            onMouseEnter={playHover}
            className="flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/15 backdrop-blur-md px-5 py-2.5 text-sm font-semibold text-violet-200 shadow-lg shadow-violet-500/15 transition-all duration-200 hover:border-violet-400 hover:bg-violet-500/25 hover:text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.35)] active:scale-95"
          >
            <Plus size={16} className="text-violet-300" />
            <span>+ Добавить видео</span>
          </button>
        )}
      </div>

      {/* Список / Сетка видео */}
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            <Film size={32} />
          </div>
          <h3 className="text-base font-semibold text-white/80">Видео пока нет</h3>
          <p className="mt-1 max-w-sm text-xs text-white/40">
            Добавляйте ролики с YouTube, Rutube, Google Диска или прямые видеофайлы
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={() => {
                playClick();
                setShowAddModal(true);
              }}
              onMouseEnter={playHover}
              className="mt-5 flex items-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/20 px-4 py-2 text-xs font-semibold text-violet-200 transition-all hover:bg-violet-500/30 active:scale-95"
            >
              <Plus size={14} />
              <span>Добавить первое видео</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video, idx) => {
            const parsed = parseVideoUrl(video.public_url);
            const isEditing = editingId === video.id;

            return (
              <div
                key={video.id}
                onClick={() => {
                  if (!isEditing) {
                    playClick();
                    setLightboxIndex(idx);
                  }
                }}
                onMouseEnter={playHover}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0e121b] transition-all duration-300 hover:border-violet-500/40 hover:shadow-[0_0_24px_rgba(139,92,246,0.25)] cursor-pointer"
              >
                {/* 16:9 Превью зона */}
                <div className="relative aspect-video w-full overflow-hidden bg-[#07090e]">
                  {parsed.provider === 'youtube' && parsed.thumbnailUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={parsed.thumbnailUrl}
                      alt={video.caption || 'Видео YouTube'}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    /* Стильная неоновая заглушка для Google Диска / Rutube / прямых ссылок */
                    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-[#121626] via-[#090b12] to-[#151329] flex items-center justify-center">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.18)_0%,transparent_70%)]" />
                      <Film
                        size={96}
                        className="absolute -right-4 -bottom-4 text-white/[0.04] rotate-12 pointer-events-none"
                      />
                    </div>
                  )}

                  {/* Бейдж платформы в верхнем левом углу */}
                  <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
                    {parsed.provider === 'youtube' ? (
                      <span className="rounded-md border border-red-500/30 bg-red-600/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                        YouTube
                      </span>
                    ) : parsed.provider === 'drive' ? (
                      <span className="rounded-md border border-emerald-500/30 bg-emerald-600/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                        Google Диск
                      </span>
                    ) : parsed.provider === 'rutube' ? (
                      <span className="rounded-md border border-blue-500/30 bg-blue-600/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                        Rutube
                      </span>
                    ) : (
                      <span className="rounded-md border border-violet-500/30 bg-violet-600/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                        Видеофайл
                      </span>
                    )}
                  </div>

                  {/* Кнопка внешнего перехода */}
                  <a
                    href={video.public_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Открыть ссылку в новой вкладке"
                    className="absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-white/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 hover:text-white"
                  >
                    <ExternalLink size={13} />
                  </a>

                  {/* Крупная кнопка Play по центру */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:bg-violet-600 group-hover:border-violet-400 group-hover:shadow-[0_0_25px_rgba(139,92,246,0.8)]">
                      <Play size={24} className="ml-1 fill-white text-white" />
                    </div>
                  </div>

                  {/* Нижний градиент для контрастности */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0e121b] via-[#0e121b]/60 to-transparent pointer-events-none" />
                </div>

                {/* Нижняя плашка с названием и действиями */}
                <div className="p-3.5 bg-[#0e121b] flex-1 flex flex-col justify-between border-t border-white/5">
                  {isEditing ? (
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveCaption(video.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="flex-1 rounded-lg border border-violet-500/40 bg-white/5 px-2.5 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="Название ролика..."
                      />
                      <button
                        type="button"
                        onClick={(e) => saveCaption(video.id, e)}
                        className="rounded-lg bg-violet-600 p-1.5 text-white hover:bg-violet-500 transition-colors"
                        title="Сохранить"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg bg-white/10 p-1.5 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                        title="Отмена"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/90 group-hover:text-violet-300 transition-colors line-clamp-1">
                          {video.caption || parsed.platformName}
                        </p>
                        <p className="mt-0.5 text-[11px] font-mono text-white/40 truncate">
                          {video.public_url}
                        </p>
                      </div>

                      {/* Действия для владельца */}
                      {isOwner && (
                        <div
                          className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => startEdit(video, e)}
                            title="Изменить название"
                            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteVideo(video, e)}
                            title="Удалить видео"
                            className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модал добавления видео */}
      {showAddModal && (
        <VideoLinkModal
          gameId={gameId}
          onClose={() => setShowAddModal(false)}
          onAdded={onRefresh}
        />
      )}

      {/* Полноэкранный плеер через Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          screenshots={videos}
          initialIndex={lightboxIndex}
          isOwner={isOwner}
          onClose={() => setLightboxIndex(null)}
          onDelete={(v) => handleDeleteVideo(v)}
          onCaptionUpdate={handleLightboxCaptionUpdate}
        />
      )}
    </div>
  );
}
