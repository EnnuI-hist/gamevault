'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Image as ImageIcon, Trash2, Pencil } from 'lucide-react';
import TiltCard from './TiltCard';
import type { Game } from '@/lib/types';

interface GameCardProps {
  game: Game;
  isOwner?: boolean;
  onDelete?: (game: Game) => void;
  onEdit?: (game: Game) => void;
}

export default function GameCard({
  game,
  isOwner,
  onDelete,
  onEdit,
}: GameCardProps) {
  return (
    <Link href={`/game?slug=${encodeURIComponent(game.slug)}`} className="group block">
      <TiltCard
        coverUrl={game.cover_url}
        className="border border-white/10 neon-card-glow"
      >
        {/* Постер 2:3 */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0d1119]">
          {game.cover_url ? (
            <Image
              src={game.cover_url}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-[var(--neon-badge-bg)] via-slate-900 to-[#10141d]">
              <ImageIcon size={38} className="text-white/20 mb-2" />
              <p className="font-fantasy font-bold text-white/80 text-xs sm:text-sm line-clamp-2">
                {game.title}
              </p>
            </div>
          )}

          {/* Оверлей затемнения снизу при наведении */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

          {/* Кнопки действий для владельца (справа сверху при наведении) */}
          {isOwner && (
            <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {onEdit && (
                <button
                  type="button"
                  title="Редактировать обложку и название"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(game);
                  }}
                  className="flex items-center justify-center rounded-lg bg-black/75 backdrop-blur-md p-2 text-white/80 shadow-lg transition hover:bg-[var(--neon-primary)] hover:text-white"
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
                    onDelete(game);
                  }}
                  className="flex items-center justify-center rounded-lg bg-black/75 backdrop-blur-md p-2 text-white/80 shadow-lg transition hover:bg-red-600 hover:text-white"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Информация под постером */}
        <div className="p-3 bg-[#0f131c]/95 border-t border-white/5">
          <h3 className="truncate font-fantasy text-sm font-bold text-white group-hover:text-[var(--neon-text)] transition-colors tracking-wide">
            {game.title}
          </h3>
          <p className="mt-0.5 font-mono text-[11px] text-white/40">
            {game.screenshot_count ?? 0}{' '}
            {pluralScreenshots(game.screenshot_count ?? 0)}
          </p>
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
