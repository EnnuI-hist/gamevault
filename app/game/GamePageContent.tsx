'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import ScreenshotGrid from '@/components/ScreenshotGrid';
import UploadZone from '@/components/UploadZone';
import DownloadZipButton from '@/components/DownloadZipButton';
import type { Game, Screenshot } from '@/lib/types';

const PAGE_SIZE = 30;

export default function GamePageContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  const { user } = useAuth();

  const [game, setGame] = useState<Game | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const loadGameData = async () => {
      setLoading(true);
      setNotFound(false);

      // 1. Загружаем игру по slug
      const { data: gameData, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('slug', slug)
        .single();

      if (gameErr || !gameData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setGame(gameData);

      // 2. Загружаем скриншоты
      const { data: shotsData } = await supabase
        .from('screenshots')
        .select('*')
        .eq('game_id', gameData.id)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      const { count } = await supabase
        .from('screenshots')
        .select('*', { count: 'exact', head: true })
        .eq('game_id', gameData.id);

      setScreenshots((shotsData ?? []) as Screenshot[]);
      setHasMore((count ?? 0) > PAGE_SIZE);
      setLoading(false);
    };

    loadGameData();
  }, [slug, refreshKey]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 size={36} className="animate-spin text-indigo-500" />
        <p className="mt-4 text-sm text-white/40">Загрузка игры...</p>
      </div>
    );
  }

  if (notFound || !game) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <div className="mb-4 flex h-20 w-20 mx-auto items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <Gamepad2 size={36} className="text-white/30" />
        </div>
        <h1 className="text-2xl font-bold text-white">Игра не найдена</h1>
        <p className="mt-2 text-sm text-white/40">
          Возможно, она была удалена или указан неверный адрес
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          <ArrowLeft size={16} />
          Вернуться на главную
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Шапка игры с размытым фоном */}
      <div className="relative overflow-hidden">
        {game.cover_url && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={game.cover_url}
              alt=""
              className="h-full w-full object-cover opacity-20 blur-2xl scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0c10]/60 via-[#0a0c10]/80 to-[#0a0c10]" />
          </div>
        )}

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white mb-6"
          >
            <ArrowLeft size={16} />
            Назад к играм
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {game.cover_url && (
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg shadow-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={game.cover_url}
                    alt={game.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-white">{game.title}</h1>
                <p className="mt-1 text-sm text-white/40">
                  {screenshots.length > 0
                    ? `${screenshots.length}+ скриншотов`
                    : 'Скриншотов пока нет'}
                </p>
              </div>
            </div>

            <DownloadZipButton game={game} />
          </div>
        </div>
      </div>

      {/* Контент */}
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {user && (
          <UploadZone
            gameId={game.id}
            gameSlug={game.slug}
            onUploaded={() => setRefreshKey((k) => k + 1)}
          />
        )}

        <ScreenshotGrid
          key={refreshKey}
          gameId={game.id}
          isOwner={!!user}
          initialScreenshots={screenshots}
          initialHasMore={hasMore}
        />
      </div>
    </div>
  );
}
