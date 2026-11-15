'use client';

import { useState, useEffect } from 'react';
import { Plus, Gamepad2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import GameCard from '@/components/GameCard';
import AddGameModal from '@/components/AddGameModal';
import DeleteGameModal from '@/components/DeleteGameModal';
import type { Game } from '@/lib/types';

export default function HomePage() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGame, setShowAddGame] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const supabase = createClient();

  const loadGames = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('games')
      .select(`
        *,
        screenshot_count:screenshots(count)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      const mapped = data.map((g) => ({
        ...g,
        screenshot_count: Array.isArray(g.screenshot_count)
          ? (g.screenshot_count[0] as { count: number })?.count ?? 0
          : 0,
      }));
      setGames(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGames();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Заголовок */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Архив скриншотов
          </h1>
          <p className="mt-1 text-sm text-white/40">
            {games.length > 0
              ? `${games.length} ${pluralGames(games.length)} в коллекции`
              : 'Коллекция пустая'}
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowAddGame(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20"
          >
            <Plus size={18} />
            Добавить игру
          </button>
        )}
      </div>

      {/* Сетка игр */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-white/5">
              <div className="aspect-[2/3] rounded-t-xl bg-white/10" />
              <div className="p-3 space-y-2">
                <div className="h-3 rounded bg-white/10" />
                <div className="h-2 w-2/3 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Gamepad2 size={36} className="text-white/30" />
          </div>
          <h2 className="text-xl font-semibold text-white/60">Игр пока нет</h2>
          <p className="mt-2 text-sm text-white/30">
            {user ? 'Нажми «Добавить игру», чтобы начать' : 'Коллекция пустая'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              isOwner={!!user}
              onDelete={(g) => setGameToDelete(g)}
            />
          ))}
        </div>
      )}

      {/* Модал создания игры */}
      {showAddGame && (
        <AddGameModal
          onClose={() => setShowAddGame(false)}
          onAdded={loadGames}
        />
      )}

      {/* Модал удаления игры */}
      {gameToDelete && (
        <DeleteGameModal
          game={gameToDelete}
          onClose={() => setGameToDelete(null)}
          onDeleted={() => {
            setGameToDelete(null);
            loadGames();
          }}
        />
      )}
    </div>
  );
}

function pluralGames(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'игра';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'игры';
  return 'игр';
}
