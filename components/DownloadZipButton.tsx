'use client';

import { useState } from 'react';
import { Download, Loader2, Check, Archive, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import type { Game } from '@/lib/types';

interface DownloadZipButtonProps {
  game: Game;
}

export default function DownloadZipButton({ game }: DownloadZipButtonProps) {
  const [status, setStatus] = useState<'idle' | 'fetching' | 'zipping' | 'done' | 'error'>('idle');
  const [progressText, setProgressText] = useState('');
  const [percent, setPercent] = useState(0);
  const supabase = createClient();

  const handleDownloadAll = async () => {
    if (status !== 'idle' && status !== 'error' && status !== 'done') return;

    try {
      setStatus('fetching');
      setProgressText('Получение списка файлов...');
      setPercent(5);

      // Получаем все скриншоты игры
      const { data: screenshots, error } = await supabase
        .from('screenshots')
        .select('id, storage_path, public_url, caption')
        .eq('game_id', game.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!screenshots || screenshots.length === 0) {
        alert('В этой игре пока нет скриншотов для скачивания');
        setStatus('idle');
        return;
      }

      const zip = new JSZip();
      const total = screenshots.length;
      let downloaded = 0;

      // Скачиваем файлы пачками по 3 параллельно
      const batchSize = 3;
      for (let i = 0; i < screenshots.length; i += batchSize) {
        const batch = screenshots.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (shot, bIdx) => {
            const index = i + bIdx + 1;
            const resp = await fetch(shot.public_url);
            if (!resp.ok) {
              throw new Error(`Ошибка загрузки изображения: ${resp.status}`);
            }
            const blob = await resp.blob();

            const ext = shot.storage_path.split('.').pop() || 'jpg';
            const num = String(index).padStart(3, '0');
            const captionSuffix = shot.caption
              ? `_${slugify(shot.caption).slice(0, 30)}`
              : '';
            const filename = `${game.slug || 'screenshot'}_${num}${captionSuffix}.${ext}`;

            zip.file(filename, blob);
            downloaded++;

            const currentPercent = Math.round((downloaded / total) * 75);
            setPercent(5 + currentPercent);
            setProgressText(`${downloaded} / ${total}`);
          })
        );
      }

      // Генерация ZIP
      setStatus('zipping');
      setProgressText('Сжатие архива...');

      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'STORE' },
        (meta) => {
          setPercent(80 + Math.round((meta.percent / 100) * 20));
        }
      );

      // Инициируем скачивание
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `${game.slug || 'game'}-screenshots.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(zipUrl), 3000);

      setStatus('done');
      setProgressText('Готово!');
      setTimeout(() => {
        setStatus('idle');
        setPercent(0);
        setProgressText('');
      }, 3000);
    } catch (err) {
      console.error('Ошибка создания ZIP:', err);
      setStatus('error');
      setProgressText('Ошибка скачивания');
      setTimeout(() => {
        setStatus('idle');
        setPercent(0);
        setProgressText('');
      }, 3500);
    }
  };

  const isWorking = status === 'fetching' || status === 'zipping';

  return (
    <button
      onClick={handleDownloadAll}
      disabled={isWorking}
      title="Скачать все скриншоты одним ZIP архивом"
      className="relative flex items-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-[#131720] px-4 py-2.5 text-sm font-medium text-white transition hover:border-indigo-500/50 hover:bg-white/5 hover:text-indigo-300 disabled:opacity-80 shrink-0"
    >
      {/* Фоновый прогресс-бар при скачивании */}
      {isWorking && (
        <div
          className="absolute inset-y-0 left-0 bg-indigo-600/30 transition-all duration-300 pointer-events-none"
          style={{ width: `${percent}%` }}
        />
      )}

      <span className="relative z-10 flex items-center gap-2">
        {isWorking && <Loader2 size={16} className="animate-spin text-indigo-400" />}
        {status === 'done' && <Check size={16} className="text-green-400" />}
        {status === 'error' && <AlertCircle size={16} className="text-red-400" />}
        {status === 'idle' && <Archive size={16} className="text-indigo-400" />}

        <span>
          {status === 'idle' && 'Скачать все (ZIP)'}
          {status === 'fetching' && `Скачивание: ${progressText}`}
          {status === 'zipping' && progressText}
          {status === 'done' && 'Архив скачан!'}
          {status === 'error' && progressText}
        </span>
      </span>
    </button>
  );
}
