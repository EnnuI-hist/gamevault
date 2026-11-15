'use client';

import Link from 'next/link';
import { Image as ImageIcon, Video, Trash2, Pencil } from 'lucide-react';
import TiltCard from './TiltCard';
import { resolveMediaUrl } from '@/lib/utils';
import { playClick, playHover } from '@/lib/sounds';
import type { Game } from '@/lib/types';

interface GameCardProps {
  game: Game;
  isOwner?: boolean;
  onDelete?: (game: Game) => void;
  onEdit?: (game: Game) => void;
  index?: number;
  priority?: boolean;
}

export default function GameCard({
  game,
  isOwner,
  onDelete,
  onEdit,
  index,
  priority,
}: GameCardProps) {
  const isPriority = priority ?? (index !== undefined && index < 6);
  const resolvedCoverUrl = resolveMediaUrl(game.cover_url);

  return (
    <Link
      href={`/game?slug=${encodeURIComponent(game.slug)}`}
      onClick={playClick}
      onMouseEnter={playHover}
      className="group block"
    >
      <TiltCard
        coverUrl={resolvedCoverUrl}
        className="border border-white/10 neon-card-glow"
      >
        {/* Постер 2:3 */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0d1119]">
          {game.cover_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={resolvedCoverUrl}
              alt={game.title}
              loading={isPriority ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[var(--neon-badge-bg)] via-slate-900 to-[#10141d]">
              <ImageIcon size={38} className="text-white/20 mb-2" />
              <p className="font-fantasy font-bold text-white/80 text-xs sm:text-sm line-clamp-2">
                {game.title}
              </p>
            </div>
          )}

          {/* Бейджи счётчиков фото и видео на обложке */}
          <div className="absolute top-2.5 left-2.5 z-20 flex flex-wrap items-center gap-1.5 pointer-events-none">
            {(game.screenshot_count ?? 0) > 0 && (
              <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-black/65 backdrop-blur-md px-2 py-0.5 text-[11px] font-mono font-medium text-white/90 shadow-md">
                <ImageIcon size={11} className="text-white/70" />
                <span>{game.screenshot_count}</span>
              </div>
            )}
            {(game.video_count ?? 0) > 0 && (
              <div className="flex items-center gap-1 rounded-lg border border-violet-500/40 bg-black/65 backdrop-blur-md px-2 py-0.5 text-[11px] font-mono font-medium text-violet-300 shadow-md shadow-violet-500/20">
                <Video size={11} className="text-violet-400" />
                <span>{game.video_count}</span>
              </div>
            )}
          </div>

          {/* Оверлей затемнения снизу при наведении */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

          {/* Кнопки действий для владельца (справа сверху при наведении - лаунчерный стеклянный стиль) */}
          {isOwner && (
            <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {onEdit && (
                <button
                  type="button"
                  title="Редактировать обложку и название"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    playClick();
                    onEdit(game);
                  }}
                  onMouseEnter={playHover}
                  className="flex items-center justify-center rounded-xl border border-white/15 bg-[#0d111a]/80 backdrop-blur-md p-2 text-white/80 shadow-lg transition-all duration-200 hover:border-[var(--neon-border)] hover:bg-[var(--neon-badge-bg)] hover:text-[var(--neon-text)] hover:shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.35)] active:scale-95"
                >
                  <Pencil size={13} />
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  title="Удалить игру"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    playClick();
                    onDelete(game);
                  }}
                  onMouseEnter={playHover}
                  className="flex items-center justify-center rounded-xl border border-white/15 bg-[#0d111a]/80 backdrop-blur-md p-2 text-white/80 shadow-lg transition-all duration-200 hover:border-red-500/60 hover:bg-red-500/20 hover:text-red-300 hover:shadow-[0_0_12px_rgba(239,68,68,0.35)] active:scale-95"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Информация под постером */}
        <div className="p-3 bg-[#0f131c]/80 backdrop-blur-md border-t border-white/5">
          <h3 className="truncate font-fantasy text-sm font-bold text-white group-hover:text-[var(--neon-text)] transition-colors tracking-wide">
            {game.title}
          </h3>
          <div className="mt-1 flex items-center flex-wrap gap-x-2 gap-y-0.5 font-mono text-[11px] text-white/40">
            <span>
              {game.screenshot_count ?? 0}{' '}
              {pluralScreenshots(game.screenshot_count ?? 0)}
            </span>
            {(game.video_count ?? 0) > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-violet-400/90 font-medium">
                  <Video size={11} className="text-violet-400" />
                  <span>{game.video_count} {pluralVideos(game.video_count!)}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </TiltCard>
    </Link>
  );
}

function pluralScreenshots(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'скриншот';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'скриншота';
  return 'скриншотов';
}

function pluralVideos(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'видео';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'видео';
  return 'видео';
}
