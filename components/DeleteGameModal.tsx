'use client';

import { useState } from 'react';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { playClick } from '@/lib/sounds';
import type { Game } from '@/lib/types';

interface DeleteGameModalProps {
  game: Game;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteGameModal({
  game,
  onClose,
  onDeleted,
}: DeleteGameModalProps) {
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    setStatusText('Поиск файлов в облаке...');

    try {
      const pathsToRemove: string[] = [];

      // 1. Собираем пути всех скриншотов (только image — Cloudinary видео не в Supabase Storage)
      const { data: screenshots, error: fetchErr } = await supabase
        .from('screenshots')
        .select('storage_path, media_type')
        .eq('game_id', game.id);

      if (!fetchErr && screenshots) {
        for (const s of screenshots) {
          if (s.storage_path && s.media_type !== 'video' && !pathsToRemove.includes(s.storage_path)) {
            pathsToRemove.push(s.storage_path);
          }
        }
      }

      // 2. Собираем пути файлов сохранений из таблицы game_saves
      const { data: saves, error: savesErr } = await supabase
        .from('game_saves')
        .select('storage_path')
        .eq('game_id', game.id);

      if (!savesErr && saves) {
        for (const save of saves) {
          if (save.storage_path && !pathsToRemove.includes(save.storage_path)) {
            pathsToRemove.push(save.storage_path);
          }
        }
      }

      // 3. Добавляем обложку игры, если она есть в бакете screenshots
      if (game.cover_url && game.cover_url.includes('/screenshots/')) {
        const parts = game.cover_url.split('/screenshots/');
        if (parts[1]) {
          const coverPath = decodeURIComponent(parts[1].split('?')[0]);
          if (!pathsToRemove.includes(coverPath)) {
            pathsToRemove.push(coverPath);
          }
        }
      }

      // 4. Сканируем папку игры в Storage на случай файлов без записей в БД
      if (game.slug) {
        // Папка скриншотов [game_slug]
        const { data: folderFiles } = await supabase.storage
          .from('screenshots')
          .list(game.slug);

        if (folderFiles && folderFiles.length > 0) {
          for (const file of folderFiles) {
            const p = `${game.slug}/${file.name}`;
            if (!pathsToRemove.includes(p)) {
              pathsToRemove.push(p);
            }
          }
        }

        // Папка сохранений saves/[game_slug]
        const { data: saveFiles } = await supabase.storage
          .from('screenshots')
          .list(`saves/${game.slug}`);

        if (saveFiles && saveFiles.length > 0) {
          for (const file of saveFiles) {
            const p = `saves/${game.slug}/${file.name}`;
            if (!pathsToRemove.includes(p)) {
              pathsToRemove.push(p);
            }
          }
        }
      }

      // 5. Удаляем все файлы из Supabase Storage пачками по 50
      if (pathsToRemove.length > 0) {
        setStatusText(`Очистка хранилища (${pathsToRemove.length} файлов)...`);
        for (let i = 0; i < pathsToRemove.length; i += 50) {
          const chunk = pathsToRemove.slice(i, i + 50);
          const { error: removeErr } = await supabase.storage
            .from('screenshots')
            .remove(chunk);
          if (removeErr) {
            console.warn('Предупреждение при удалении файлов из Storage:', removeErr);
          }
        }
      }

      // 6. Удаляем игру из БД (связанные скриншоты и game_saves удалятся каскадно)
      setStatusText('Удаление игры из базы данных...');
      const { error: deleteErr } = await supabase
        .from('games')
        .delete()
        .eq('id', game.id);

      if (deleteErr) throw deleteErr;

      onDeleted();
    } catch (err) {
      console.error('Ошибка при удалении игры:', err);
      setError(err instanceof Error ? err.message : 'Не удалось удалить игру');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => !loading && e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-[#0d111a]/95 backdrop-blur-xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-xl border border-transparent p-1.5 text-white/40 transition-all duration-200 hover:border-white/10 hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 text-red-400 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-fantasy">Удалить игру?</h2>
            <p className="text-xs text-red-400/80 font-mono">Действие необратимо</p>
          </div>
        </div>

        <p className="text-sm text-white/70 leading-relaxed mb-6">
          Вы уверены, что хотите удалить игру{' '}
          <strong className="text-white font-semibold">«{game.title}»</strong>?
          Все скриншоты, файлы сохранений, обложка и данные будут полностью удалены из базы данных и облачного хранилища.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              playClick();
              onClose();
            }}
            disabled={loading}
            className="rounded-xl border border-white/15 bg-[#0d111a]/80 backdrop-blur-md px-4 py-2.5 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-white/30 active:scale-95 disabled:opacity-40"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              playClick();
              handleDelete();
            }}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-red-500/60 bg-red-600/25 backdrop-blur-md px-5 py-2.5 text-sm font-medium text-red-200 shadow-[0_0_14px_rgba(239,68,68,0.3)] transition-all duration-200 hover:border-red-500 hover:bg-red-600/40 hover:text-white hover:shadow-[0_0_22px_rgba(239,68,68,0.5)] active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{statusText || 'Удаление...'}</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Удалить навсегда</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
