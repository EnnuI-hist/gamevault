'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import type { Game } from '@/lib/types';

interface GameCardProps {
  game: Game;
  isOwner?: boolean;
  onDelete?: (game: Game) => void;
}

export default function GameCard({ game, isOwner, onDelete }: GameCardProps) {
  return (
    <Link href={`/game?slug=${encodeURIComponent(game.slug)}`} className="group block">
      <div className="relative overflow-hidden rounded-xl border border-white/5 bg-[#131720] transition-all duration-300 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1">
        {/* Постер 2:3 */}
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {game.cover_url ? (
            <Image
              src={game.cover_url}
              alt={game.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-900/40 to-slate-800">
              <ImageIcon size={40} className="text-white/20" />
            </div>
          )}

          {/* Оверлей при наведении */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Кнопка удаления для владельца */}
          {isOwner && onDelete && (
            <button
              type="button"
              title="Удалить игру"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(game);
              }}
              className="absolute right-2 top-2 z-10 flex items-center justify-center rounded-lg bg-black/70 backdrop-blur-md p-2 text-white/70 opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100 hover:bg-red-600 hover:text-white"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {/* Информация */}
        <div className="p-3">
          <h3 className="truncate text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
            {game.title}
          </h3>
          <p className="mt-0.5 text-xs text-white/40">
            {game.screenshot_count ?? 0}{' '}
            {pluralScreenshots(game.screenshot_count ?? 0)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function pluralScreenshots(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'скриншот';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'скриншота';
  return 'скриншотов';
}
