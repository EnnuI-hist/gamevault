'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Gamepad2, Search, X, CheckCircle2, Clock, XCircle, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import GameCard from '@/components/GameCard';
import AddGameModal from '@/components/AddGameModal';
import DeleteGameModal from '@/components/DeleteGameModal';
import type { Game, GameStatus } from '@/lib/types';

type FilterType = 'all' | GameStatus;

export default function HomePage() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddGame, setShowAddGame] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
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
      const mapped: Game[] = data.map((g) => ({
        ...g,
        status: (g.status as GameStatus) || 'completed',
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

  // Быстрое переключение статуса в 1 клик для владельца
  const handleStatusChange = async (gameId: string, newStatus: GameStatus) => {
    // Оптимистичное обновление
    const previousGames = [...games];
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, status: newStatus } : g))
    );

    const { error } = await supabase
      .from('games')
      .update({ status: newStatus })
      .eq('id', gameId);

    if (error) {
      console.error('Ошибка обновления статуса:', error);
      alert('Не удалось обновить статус игры');
      setGames(previousGames);
    }
  };

  // Счётчики статусов
  const counts = useMemo(() => {
    return {
      all: games.length,
      completed: games.filter((g) => (g.status || 'completed') === 'completed').length,
      playing: games.filter((g) => g.status === 'playing').length,
      planned: games.filter((g) => g.status === 'planned').length,
      dropped: games.filter((g) => g.status === 'dropped').length,
    };
  }, [games]);

  // Фильтрация и поиск
  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return games.filter((g) => {
      const gStatus = g.status || 'completed';
      const matchesFilter = activeFilter === 'all' || gStatus === activeFilter;
      const matchesQuery = !query || g.title.toLowerCase().includes(query);
      return matchesFilter && matchesQuery;
    });
  }, [games, activeFilter, searchQuery]);

  const hasActiveFilters = activeFilter !== 'all' || searchQuery.trim() !== '';

  const filterTabs: { id: FilterType; label: string; icon: typeof CheckCircle2 | null; count: number; activeClass: string }[] = [
    {
      id: 'all',
      label: 'Все',
      icon: null,
      count: counts.all,
      activeClass: 'bg-indigo-600 text-white shadow-indigo-600/30',
    },
    {
      id: 'completed',
      label: 'Пройдено',
      icon: CheckCircle2,
      count: counts.completed,
      activeClass: 'bg-emerald-600 text-white shadow-emerald-600/30',
    },
    {
      id: 'playing',
      label: 'Прохожу',
      icon: Gamepad2,
      count: counts.playing,
      activeClass: 'bg-amber-600 text-white shadow-amber-600/30',
    },
    {
      id: 'planned',
      label: 'В планах',
      icon: Clock,
      count: counts.planned,
      activeClass: 'bg-sky-600 text-white shadow-sky-600/30',
    },
    {
      id: 'dropped',
      label: 'Дропнуто',
      icon: XCircle,
      count: counts.dropped,
      activeClass: 'bg-rose-600 text-white shadow-rose-600/30',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Шапка главной страницы */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Игровой архив
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
              <Sparkles size={11} />
              Трекер
            </span>
          </div>
          <p className="mt-1 text-sm text-white/40">
            {games.length > 0
              ? `${games.length} ${pluralGames(games.length)} в коллекции`
              : 'Коллекция пустая'}
          </p>
        </div>

        {user && (
          <button
            onClick={() => setShowAddGame(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95"
          >
            <Plus size={18} />
            Добавить игру
          </button>
        )}
      </div>

      {/* Панель фильтров и поиска */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Вкладки-фильтры по статусам */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? `${tab.activeClass} shadow-md`
                    : 'border border-white/5 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {Icon && <Icon size={14} className={isActive ? 'text-white' : 'text-white/60'} />}
                <span>{tab.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                    isActive
                      ? 'bg-black/25 text-white'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Поиск по названию */}
        <div className="relative w-full lg:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию..."
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-9 py-2 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-500 focus:bg-white/10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              title="Очистить поиск"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
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
      ) : filteredGames.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/30">
            <Search size={26} />
          </div>
          <h3 className="text-base font-semibold text-white/80">Ничего не найдено</h3>
          <p className="mt-1 text-sm text-white/40">
            {searchQuery
              ? `По запросу «${searchQuery}» нет игр в этом статусе`
              : 'В этой категории пока нет игр'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
              }}
              className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              isOwner={!!user}
              onDelete={(g) => setGameToDelete(g)}
              onStatusChange={handleStatusChange}
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
