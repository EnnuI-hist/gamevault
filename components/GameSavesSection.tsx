'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  HardDrive,
  Download,
  Trash2,
  UploadCloud,
  FileText,
  Archive,
  Save,
  Loader2,
  Calendar,
  AlertCircle,
  FileCode,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatFileSize, formatDate, downloadFile, resolveMediaUrl } from '@/lib/utils';
import type { GameSave } from '@/lib/types';

interface GameSavesSectionProps {
  gameId: string;
  gameSlug: string;
  isOwner: boolean;
  onSaveCountChange?: (count: number) => void;
}

/** Иконка в зависимости от расширения файла */
function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return <Archive size={22} className="text-[var(--neon-text)] shrink-0" />;
  }
  if (['sav', 'sl2', 'dat', 'bin', 'save'].includes(ext)) {
    return <Save size={22} className="text-[var(--neon-text)] shrink-0" />;
  }
  if (['json', 'xml', 'ini', 'cfg', 'txt'].includes(ext)) {
    return <FileCode size={22} className="text-sky-400 shrink-0" />;
  }
  return <FileText size={22} className="text-emerald-400 shrink-0" />;
}

export default function GameSavesSection({
  gameId,
  gameSlug,
  isOwner,
  onSaveCountChange,
}: GameSavesSectionProps) {
  const [saves, setSaves] = useState<GameSave[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const loadSaves = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('game_saves')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSaves(data as GameSave[]);
      onSaveCountChange?.(data.length);
    }
    setLoading(false);
  }, [gameId, onSaveCountChange, supabase]);

  useEffect(() => {
    loadSaves();
  }, [loadSaves]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadError('');
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || uploading) return;

    setUploading(true);
    setUploadError('');

    try {
      // Имя файла в Storage
      const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `saves/${gameSlug}/${Date.now()}_${cleanFileName}`;

      // 1. Загрузка в Supabase Storage (бакет screenshots)
      const { error: uploadErr } = await supabase.storage
        .from('screenshots')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedFile.type || 'application/octet-stream',
        });

      if (uploadErr) throw uploadErr;

      // 2. Получение публичного URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('screenshots').getPublicUrl(storagePath);

      // 3. Сохранение записи в таблице game_saves
      const { data: newSave, error: dbErr } = await supabase
        .from('game_saves')
        .insert({
          game_id: gameId,
          file_name: selectedFile.name,
          file_url: publicUrl,
          storage_path: storagePath,
          description: description.trim(),
          file_size: selectedFile.size,
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      // Успешно загружено
      setSelectedFile(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (newSave) {
        setSaves((prev) => [newSave as GameSave, ...prev]);
        onSaveCountChange?.(saves.length + 1);
      }
    } catch (err) {
      console.error('Ошибка загрузки сохранения:', err);
      setUploadError(
        err instanceof Error ? err.message : 'Не удалось загрузить файл сохранения'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (save: GameSave) => {
    if (downloadingId === save.id) return;
    try {
      setDownloadingId(save.id);
      await downloadFile(resolveMediaUrl(save.file_url), save.file_name);
    } catch (err) {
      console.error('Ошибка скачивания файла:', err);
      alert('Не удалось скачать файл сохранения');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (save: GameSave) => {
    if (!confirm(`Удалить сохранение «${save.file_name}»?`)) return;
    try {
      setDeletingId(save.id);

      // 1. Удаляем из Storage
      await supabase.storage.from('screenshots').remove([save.storage_path]);

      // 2. Удаляем запись из БД
      const { error } = await supabase
        .from('game_saves')
        .delete()
        .eq('id', save.id);

      if (error) throw error;

      setSaves((prev) => {
        const next = prev.filter((s) => s.id !== save.id);
        onSaveCountChange?.(next.length);
        return next;
      });
    } catch (err) {
      console.error('Ошибка удаления сохранения:', err);
      alert('Не удалось удалить файл сохранения');
    } finally {
      setDeletingId(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div className="space-y-8">
      {/* Форма загрузки сейва (только для владельца) */}
      {isOwner && (
        <div className="rounded-2xl border border-white/10 bg-[#131720]/80 p-5 sm:p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl neon-badge">
              <HardDrive size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Загрузить сохранение (Save)
              </h2>
              <p className="text-xs text-white/40">
                Поддерживаются любые файлы и архивы: .sav, .sl2, .dat, .zip, .rar, .7z без ограничений
              </p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            {/* Dropzone выбора файла */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`relative flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-6 transition-all duration-200 ${
                isDragOver
                  ? 'border-[var(--neon-primary)] bg-[var(--neon-badge-bg)]'
                  : selectedFile
                  ? 'border-[var(--neon-border)] bg-white/5'
                  : 'border-white/15 bg-white/[0.02] hover:border-[var(--neon-primary)] hover:bg-white/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />

              {selectedFile ? (
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedFile.name)}
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-white/40">
                      Размер: {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="ml-2 rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud
                    size={28}
                    className={isDragOver ? 'text-[var(--neon-text)]' : 'text-white/30'}
                  />
                  <div className="text-center">
                    <p className="text-sm font-medium text-white/70">
                      Перетащите файл сохранения сюда или нажмите для выбора
                    </p>
                    <p className="mt-0.5 text-xs text-white/30">
                      Любые расширения (.sav, .sl2, .dat, .zip, .rar и др.)
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Заметка к сейву */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">
                Заметка к сохранению (необязательно)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Например: Перед Маленией, 135 лвл, билд на ловкость"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition neon-ring-focus focus:bg-white/10"
              />
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                <AlertCircle size={15} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 disabled:opacity-50 neon-btn-primary active:scale-95 cursor-pointer shadow-md"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Загрузка сохранения в облако...</span>
                </>
              ) : (
                <>
                  <HardDrive size={16} className="text-[var(--neon-text)]" />
                  <span>Сохранить в архив</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Список загруженных сохранений */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            Файлы сохранений ({saves.length})
          </h2>
          <span className="text-xs text-white/40">
            Скачивание в один клик с оригинальным расширением
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[var(--neon-primary)]" />
            <p className="mt-3 text-xs text-white/40">Загрузка списка сейвов...</p>
          </div>
        ) : saves.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/30">
              <HardDrive size={28} />
            </div>
            <h3 className="text-base font-semibold text-white/70">
              Сохранений пока нет
            </h3>
            <p className="mt-1 text-xs text-white/30 max-w-sm">
              {isOwner
                ? 'Загрузите файлы сохранений или бэкапы через форму выше, чтобы не потерять игровой прогресс'
                : 'Владелец пока не добавил файлы сохранений для этой игры'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saves.map((save) => (
              <div
                key={save.id}
                className="group relative flex flex-col justify-between rounded-xl border border-white/5 bg-[#131720] p-4 transition-all duration-200 hover:border-[var(--neon-border)] hover:bg-[#161b26] hover:shadow-lg"
              >
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                      {getFileIcon(save.file_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        title={save.file_name}
                        className="truncate text-sm font-semibold text-white group-hover:text-[var(--neon-text)] transition-colors"
                      >
                        {save.file_name}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                        <span>{formatFileSize(save.file_size || 0)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(save.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Заметка к сохранению */}
                  {save.description ? (
                    <p className="mt-2 text-xs text-white/70 bg-white/5 rounded-lg px-2.5 py-1.5 leading-relaxed">
                      {save.description}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-white/20 italic">
                      Без описания
                    </p>
                  )}
                </div>

                {/* Действия (Лаунчерный стеклянный стиль) */}
                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <button
                    type="button"
                    onClick={() => handleDownload(save)}
                    disabled={downloadingId === save.id}
                    title="Скачать файл сохранения на диск"
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--neon-badge-border)] bg-[#0d111a]/80 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-[var(--neon-text)] shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.2)] transition-all duration-200 hover:bg-[var(--neon-badge-bg)] hover:border-[var(--neon-border-hover)] hover:shadow-[0_0_16px_rgba(var(--neon-primary-rgb),0.4)] hover:text-white active:scale-95 disabled:opacity-50"
                  >
                    {downloadingId === save.id ? (
                      <Loader2 size={13} className="animate-spin text-[var(--neon-text)]" />
                    ) : (
                      <Download size={13} />
                    )}
                    <span>{downloadingId === save.id ? 'Скачивание...' : 'Скачать'}</span>
                  </button>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDelete(save)}
                      disabled={deletingId === save.id}
                      title="Удалить сохранение"
                      className="rounded-xl border border-transparent p-1.5 text-white/40 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 active:scale-95 disabled:opacity-50"
                    >
                      {deletingId === save.id ? (
                        <Loader2 size={14} className="animate-spin text-red-400" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
