'use client';

import { useState, useMemo } from 'react';
import { X, Link2, ListPlus, Loader2, AlertCircle, Film, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { parseVideoUrl, isValidHttpUrl } from '@/lib/videoUtils';
import { playClick, playHover, playSuccess } from '@/lib/sounds';

interface VideoLinkModalProps {
  gameId: string;
  onClose: () => void;
  onAdded: () => void;
}

export default function VideoLinkModal({ gameId, onClose, onAdded }: VideoLinkModalProps) {
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  // Single mode state
  const [singleUrl, setSingleUrl] = useState('');
  const [singleCaption, setSingleCaption] = useState('');

  // Batch mode state
  const [batchText, setBatchText] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  // Preview info for single mode
  const singleParsed = useMemo(() => {
    if (!singleUrl.trim()) return null;
    return parseVideoUrl(singleUrl);
  }, [singleUrl]);

  // Valid links list for batch mode
  const batchLinks = useMemo(() => {
    if (!batchText.trim()) return [];
    return batchText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && isValidHttpUrl(line));
  }, [batchText]);

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = singleUrl.trim();
    if (!url) {
      setErrorMessage('Укажите ссылку на видео');
      return;
    }
    if (!isValidHttpUrl(url)) {
      setErrorMessage('Введите корректный URL (начинающийся с https:// или http://)');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { error } = await supabase.from('screenshots').insert({
        game_id: gameId,
        storage_path: 'video-link',
        public_url: url,
        caption: singleCaption.trim(),
        media_type: 'video',
        size_bytes: 0,
      });

      if (error) throw error;

      playSuccess();
      onAdded();
      onClose();
    } catch (err) {
      console.error('Ошибка добавления видео:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Не удалось сохранить видео');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchLinks.length === 0) {
      setErrorMessage('Вставьте хотя бы одну корректную ссылку на видео (каждая с новой строки)');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const rows = batchLinks.map((link) => ({
        game_id: gameId,
        storage_path: 'video-link',
        public_url: link,
        caption: '',
        media_type: 'video',
        size_bytes: 0,
      }));

      const { error } = await supabase.from('screenshots').insert(rows);

      if (error) throw error;

      playSuccess();
      onAdded();
      onClose();
    } catch (err) {
      console.error('Ошибка пакетного добавления видео:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Не удалось сохранить видео');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0e121b] p-6 shadow-2xl neon-card-glow text-white">
        {/* Кнопка закрытия */}
        <button
          type="button"
          onClick={() => {
            playClick();
            onClose();
          }}
          onMouseEnter={playHover}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Заголовок */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
            <Film size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">Добавить видео</h2>
            <p className="text-xs text-white/50">
              YouTube, Rutube, Google Диск или прямые ссылки
            </p>
          </div>
        </div>

        {/* Переключатель режимов: Одиночное vs Пакетное */}
        <div className="mb-5 flex rounded-xl border border-white/10 bg-[#090b10] p-1">
          <button
            type="button"
            onClick={() => {
              playClick();
              setMode('single');
              setErrorMessage('');
            }}
            onMouseEnter={playHover}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${
              mode === 'single'
                ? 'bg-violet-600/30 border border-violet-500/40 text-violet-200 shadow-md shadow-violet-500/20'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Link2 size={14} />
            <span>Одиночная ссылка</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClick();
              setMode('batch');
              setErrorMessage('');
            }}
            onMouseEnter={playHover}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${
              mode === 'batch'
                ? 'bg-violet-600/30 border border-violet-500/40 text-violet-200 shadow-md shadow-violet-500/20'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <ListPlus size={14} />
            <span>Пакетное добавление (списком)</span>
          </button>
        </div>

        {/* Ошибка */}
        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Режим 1: Одиночное добавление */}
        {mode === 'single' ? (
          <form onSubmit={handleSubmitSingle} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Ссылка на видео <span className="text-violet-400">*</span>
              </label>
              <input
                type="url"
                required
                autoFocus
                value={singleUrl}
                onChange={(e) => setSingleUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... или youtu.be, rutube, google drive"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-violet-500/60 focus:bg-white/10 focus:ring-1 focus:ring-violet-500/60"
              />
            </div>

            {/* Детектор платформы и предпросмотр превью */}
            {singleParsed && singleParsed.platformName && (
              <div className="rounded-xl border border-white/10 bg-[#090c13] p-3 flex items-center gap-3">
                {singleParsed.thumbnailUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={singleParsed.thumbnailUrl}
                    alt="Предпросмотр"
                    className="h-14 w-24 object-cover rounded-lg border border-white/10"
                  />
                ) : (
                  <div className="flex h-14 w-24 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white/40">
                    <Film size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-violet-400" />
                    <span className="text-xs font-semibold text-violet-300">
                      Платформа: {singleParsed.platformName}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-white/40 truncate">
                    {singleUrl}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Название или описание момента (необязательно)
              </label>
              <input
                type="text"
                value={singleCaption}
                onChange={(e) => setSingleCaption(e.target.value)}
                placeholder="Например: Эпичная битва с боссом на арене"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-violet-500/60 focus:bg-white/10 focus:ring-1 focus:ring-violet-500/60"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onClose();
                }}
                disabled={loading}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                <span>{loading ? 'Сохранение...' : 'Добавить видео'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Режим 2: Пакетное добавление списком */
          <form onSubmit={handleSubmitBatch} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-white/70">
                  Ссылки списком (каждая с новой строки)
                </label>
                <span className="text-[11px] font-mono text-violet-400">
                  Найдено ссылок: {batchLinks.length}
                </span>
              </div>
              <textarea
                rows={7}
                autoFocus
                required
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={`https://www.youtube.com/watch?v=...\nhttps://youtu.be/...\nhttps://rutube.ru/video/...\nhttps://drive.google.com/file/d/...`}
                className="w-full font-mono text-xs rounded-xl border border-white/10 bg-white/5 p-3 text-white placeholder-white/30 outline-none transition focus:border-violet-500/60 focus:bg-white/10 focus:ring-1 focus:ring-violet-500/60 resize-y"
              />
              <p className="mt-1 text-[11px] text-white/40">
                Вставьте от 1 до 50 ссылок — каждая ссылка будет сохранена как отдельная карточка за один клик.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onClose();
                }}
                disabled={loading}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading || batchLinks.length === 0}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                <span>
                  {loading
                    ? 'Сохранение...'
                    : `Добавить все (${batchLinks.length})`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
