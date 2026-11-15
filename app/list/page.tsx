'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Search,
  X,
  CheckCircle2,
  Gamepad2,
  Clock,
  XCircle,
  Trash2,
  Edit3,
  Check,
  MessageSquare,
  MessageSquarePlus,
  Loader2,
  ImagePlus,
  ImageIcon,
  Upload,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import StatusBadge, { STATUS_LIST } from '@/components/StatusBadge';
import type { BacklogItem, GameStatus } from '@/lib/types';

type FilterType = 'all' | GameStatus;

/** Конвертирует изображение в WebP через Canvas с качеством 0.92 */
async function compressCoverToWebP(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/webp') {
      resolve(file);
      return;
    }
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) resolve(blob);
          else resolve(file);
        },
        'image/webp',
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export default function BacklogPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Форма добавления игры
  const [newTitle, setNewTitle] = useState('');
  const [newStatus, setNewStatus] = useState<GameStatus>('completed');
  const [newNote, setNewNote] = useState('');
  const [coverSourceType, setCoverSourceType] = useState<'none' | 'file' | 'url'>('none');
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [newCoverUrl, setNewCoverUrl] = useState('');
  const [newCoverPreview, setNewCoverPreview] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showCoverInputs, setShowCoverInputs] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Фильтры и поиск
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Модалка изменения обложки
  const [coverModalItem, setCoverModalItem] = useState<BacklogItem | null>(null);
  const [coverTab, setCoverTab] = useState<'upload' | 'url'>('upload');
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [coverFileInput, setCoverFileInput] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [isSavingCover, setIsSavingCover] = useState(false);
  const [coverError, setCoverError] = useState('');
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Модалка изменения заметки
  const [noteModalItem, setNoteModalItem] = useState<BacklogItem | null>(null);
  const [noteInputDraft, setNoteInputDraft] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const supabase = createClient();

  const loadBacklog = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('game_backlog')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data as BacklogItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadBacklog();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadBacklog();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', loadBacklog);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', loadBacklog);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Вставка обложки из буфера по Ctrl+V при открытой форме или модалке
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const itemsList = Array.from(e.clipboardData?.items ?? []);
      const imgItem = itemsList.find((i) => i.type.startsWith('image/'));
      if (!imgItem) return;

      const file = imgItem.getAsFile();
      if (!file) return;

      if (coverModalItem) {
        // Если открыто модальное окно обложки
        setCoverFileInput(file);
        setCoverPreview(URL.createObjectURL(file));
        setCoverTab('upload');
        setCoverError('');
      } else if (user) {
        // Если активна форма создания
        setNewCoverFile(file);
        setNewCoverPreview(URL.createObjectURL(file));
        setCoverSourceType('file');
        setShowCoverInputs(true);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [coverModalItem, user]);

  // Добавление новой игры
  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || isAdding) return;

    setIsAdding(true);

    try {
      let finalCoverUrl: string | null = null;

      // Загрузка файла обложки, если выбран
      if (coverSourceType === 'file' && newCoverFile) {
        const compressed = await compressCoverToWebP(newCoverFile);
        const path = `backlog-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

        const { error: upErr } = await supabase.storage
          .from('screenshots')
          .upload(path, compressed, {
            cacheControl: '3600',
            upsert: false,
            contentType: 'image/webp',
          });

        if (upErr) throw upErr;

        const {
          data: { publicUrl },
        } = supabase.storage.from('screenshots').getPublicUrl(path);

        finalCoverUrl = publicUrl;
      } else if (coverSourceType === 'url' && newCoverUrl.trim()) {
        finalCoverUrl = newCoverUrl.trim();
      }

      const { data, error } = await supabase
        .from('game_backlog')
        .insert({
          title,
          status: newStatus,
          note: newNote.trim(),
          cover_url: finalCoverUrl,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setItems((prev) => [data as BacklogItem, ...prev]);
        setNewTitle('');
        setNewNote('');
        setNewCoverFile(null);
        setNewCoverUrl('');
        setNewCoverPreview('');
        setCoverSourceType('none');
        setShowCoverInputs(false);
        setNewStatus('completed');
        titleInputRef.current?.focus();
      }
    } catch (err) {
      console.error('Ошибка добавления игры:', err);
      alert('Не удалось добавить игру в список');
    } finally {
      setIsAdding(false);
    }
  };

  // Переключение статуса в 1 клик
  const handleStatusChange = async (id: string, nextStatus: GameStatus) => {
    const prevItems = [...items];
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
    );

    const { error } = await supabase
      .from('game_backlog')
      .update({ status: nextStatus })
      .eq('id', id);

    if (error) {
      console.error('Ошибка обновления статуса:', error);
      setItems(prevItems);
      alert('Не удалось обновить статус');
    }
  };

  // Удаление игры
  const handleDelete = async (item: BacklogItem) => {
    if (!confirm(`Удалить «${item.title}» из списка?`)) return;

    setItems((prev) => prev.filter((i) => i.id !== item.id));

    // Если была обложка в storage, подчистим
    if (item.cover_url && item.cover_url.includes('/backlog-covers/')) {
      try {
        const parts = item.cover_url.split('/screenshots/');
        if (parts[1]) {
          const oldPath = decodeURIComponent(parts[1].split('?')[0]);
          await supabase.storage.from('screenshots').remove([oldPath]);
        }
      } catch (e) {
        console.warn('Не удалось удалить файл обложки:', e);
      }
    }

    const { error } = await supabase
      .from('game_backlog')
      .delete()
      .eq('id', item.id);

    if (error) {
      console.error('Ошибка удаления:', error);
      loadBacklog();
      alert('Не удалось удалить игру');
    }
  };

  // Управление модалкой обложки
  const openCoverModal = (item: BacklogItem) => {
    setCoverModalItem(item);
    setCoverUrlInput(item.cover_url || '');
    setCoverFileInput(null);
    setCoverPreview(item.cover_url || '');
    setCoverTab(item.cover_url?.startsWith('http') ? 'url' : 'upload');
    setCoverError('');
  };

  const closeCoverModal = () => {
    setCoverModalItem(null);
    setCoverFileInput(null);
    setCoverUrlInput('');
    setCoverPreview('');
    setCoverError('');
  };

  const handleSaveCover = async () => {
    if (!coverModalItem) return;
    setIsSavingCover(true);
    setCoverError('');

    try {
      let finalCoverUrl: string | null = null;

      if (coverTab === 'upload') {
        if (coverFileInput) {
          const compressed = await compressCoverToWebP(coverFileInput);
          const path = `backlog-covers/${coverModalItem.id}-${Date.now()}.webp`;

          const { error: upErr } = await supabase.storage
            .from('screenshots')
            .upload(path, compressed, {
              cacheControl: '3600',
              upsert: true,
              contentType: 'image/webp',
            });

          if (upErr) throw upErr;

          const {
            data: { publicUrl },
          } = supabase.storage.from('screenshots').getPublicUrl(path);

          finalCoverUrl = publicUrl;

          // Удаляем старую обложку из хранилища
          if (
            coverModalItem.cover_url &&
            coverModalItem.cover_url.includes('/backlog-covers/')
          ) {
            try {
              const parts = coverModalItem.cover_url.split('/screenshots/');
              if (parts[1]) {
                const oldPath = decodeURIComponent(parts[1].split('?')[0]);
                await supabase.storage.from('screenshots').remove([oldPath]);
              }
            } catch (delErr) {
              console.warn('Ошибка удаления старой обложки:', delErr);
            }
          }
        } else {
          finalCoverUrl = coverModalItem.cover_url ?? null;
        }
      } else {
        finalCoverUrl = coverUrlInput.trim() || null;
      }

      const { error: dbErr } = await supabase
        .from('game_backlog')
        .update({ cover_url: finalCoverUrl })
        .eq('id', coverModalItem.id);

      if (dbErr) throw dbErr;

      setItems((prev) =>
        prev.map((i) =>
          i.id === coverModalItem.id ? { ...i, cover_url: finalCoverUrl } : i
        )
      );

      closeCoverModal();
    } catch (err) {
      console.error('Ошибка сохранения обложки:', err);
      setCoverError(
        err instanceof Error ? err.message : 'Не удалось сохранить обложку'
      );
    } finally {
      setIsSavingCover(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!coverModalItem) return;
    setIsSavingCover(true);
    try {
      if (
        coverModalItem.cover_url &&
        coverModalItem.cover_url.includes('/backlog-covers/')
      ) {
        const parts = coverModalItem.cover_url.split('/screenshots/');
        if (parts[1]) {
          const oldPath = decodeURIComponent(parts[1].split('?')[0]);
          await supabase.storage.from('screenshots').remove([oldPath]);
        }
      }

      const { error } = await supabase
        .from('game_backlog')
        .update({ cover_url: null })
        .eq('id', coverModalItem.id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((i) =>
          i.id === coverModalItem.id ? { ...i, cover_url: null } : i
        )
      );

      closeCoverModal();
    } catch (err) {
      console.error('Ошибка удаления обложки:', err);
      setCoverError('Не удалось удалить обложку');
    } finally {
      setIsSavingCover(false);
    }
  };

  // Управление модалкой заметки
  const openNoteModal = (item: BacklogItem) => {
    setNoteModalItem(item);
    setNoteInputDraft(item.note || '');
  };

  const handleSaveNoteModal = async () => {
    if (!noteModalItem) return;
    setIsSavingNote(true);
    const clean = noteInputDraft.trim();

    try {
      const { error } = await supabase
        .from('game_backlog')
        .update({ note: clean })
        .eq('id', noteModalItem.id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((i) => (i.id === noteModalItem.id ? { ...i, note: clean } : i))
      );

      setNoteModalItem(null);
    } catch (err) {
      console.error('Ошибка сохранения заметки:', err);
      alert('Не удалось сохранить заметку');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Счётчики
  const counts = useMemo(() => {
    return {
      all: items.length,
      completed: items.filter((i) => i.status === 'completed').length,
      playing: items.filter((i) => i.status === 'playing').length,
      planned: items.filter((i) => i.status === 'planned').length,
      dropped: items.filter((i) => i.status === 'dropped').length,
    };
  }, [items]);

  // Фильтрация и поиск
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
      const matchesQuery =
        !query ||
        item.title.toLowerCase().includes(query) ||
        (item.note && item.note.toLowerCase().includes(query));
      return matchesFilter && matchesQuery;
    });
  }, [items, activeFilter, searchQuery]);

  const hasActiveFilters = activeFilter !== 'all' || searchQuery.trim() !== '';

  const filterTabs: {
    id: FilterType;
    label: string;
    icon: typeof CheckCircle2 | null;
    count: number;
    activeClass: string;
  }[] = [
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
      {/* Шапка страницы трекера */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Список игр
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
              <Sparkles size={12} />
              Галерея постеров
            </span>
          </div>
          <p className="mt-1 text-sm text-white/40">
            {items.length > 0
              ? `${items.length} ${pluralGames(items.length)} в вашем списке`
              : 'Список пуст'}
          </p>
        </div>
      </div>

      {/* Форма быстрого добавления (только для владельца) */}
      {user && (
        <form
          onSubmit={handleAddGame}
          className="mb-8 rounded-2xl border border-white/10 bg-[#131720] p-4 sm:p-5 shadow-xl backdrop-blur-sm space-y-3.5"
        >
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Название игры */}
            <div className="relative flex-1">
              <input
                ref={titleInputRef}
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Название игры... (нажми Enter для добавления)"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-500 focus:bg-white/10"
              />
            </div>

            {/* Выбор статуса по умолчанию (Пройдено) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
              {STATUS_LIST.map((opt) => {
                const Icon = opt.icon;
                const isSelected = newStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewStatus(opt.value)}
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-all ${
                      isSelected
                        ? `${opt.badgeClass} ring-1 ring-white/20 shadow-sm`
                        : 'border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon size={13} className={opt.textClass} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Кнопка добавления обложки / индикатор */}
            <button
              type="button"
              onClick={() => setShowCoverInputs((prev) => !prev)}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all shrink-0 ${
                newCoverPreview || newCoverUrl.trim()
                  ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ImagePlus size={14} />
              <span>
                {newCoverPreview || newCoverUrl.trim()
                  ? 'Обложка прикреплена'
                  : '+ Обложка'}
              </span>
            </button>

            {/* Кнопка Добавить */}
            <button
              type="submit"
              disabled={isAdding || !newTitle.trim()}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50 shrink-0"
            >
              {isAdding ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              <span>Добавить</span>
            </button>
          </div>

          {/* Дополнительная панель добавления обложки и заметки */}
          {showCoverInputs && (
            <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-in fade-in duration-200">
              {/* Поле заметки */}
              <div className="flex-1">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Заметка или оценка (например: 9/10, шедевр)..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none transition focus:border-indigo-500 focus:bg-white/10"
                />
              </div>

              {/* Выбор файла с ПК */}
              <input
                ref={addFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setNewCoverFile(file);
                    setNewCoverPreview(URL.createObjectURL(file));
                    setCoverSourceType('file');
                  }
                }}
              />

              <button
                type="button"
                onClick={() => addFileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-all shrink-0"
              >
                <Upload size={13} />
                <span>Выбрать файл (или Ctrl+V)</span>
              </button>

              {/* Поле прямой ссылки */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="url"
                  value={newCoverUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setNewCoverUrl(url);
                    if (url.trim()) {
                      setNewCoverPreview(url.trim());
                      setCoverSourceType('url');
                      setNewCoverFile(null);
                    } else if (!newCoverFile) {
                      setNewCoverPreview('');
                      setCoverSourceType('none');
                    }
                  }}
                  placeholder="Или вставьте URL ссылки..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none transition focus:border-indigo-500 focus:bg-white/10"
                />
              </div>

              {/* Превью выбранной обложки */}
              {newCoverPreview && (
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-1 shrink-0">
                  <div className="relative h-7 w-5 overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={newCoverPreview}
                      alt="Превью"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCoverFile(null);
                      setNewCoverUrl('');
                      setNewCoverPreview('');
                      setCoverSourceType('none');
                    }}
                    className="p-1 text-white/40 hover:text-white"
                    title="Сбросить обложку"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      )}

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

        {/* Поиск */}
        <div className="relative w-full lg:w-72">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию и заметкам..."
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-9 py-2 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-500 focus:bg-white/10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              title="Очистить"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Адаптивная сетка вертикальных постеров 2:3 */}
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
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Gamepad2 size={36} className="text-white/30" />
          </div>
          <h2 className="text-xl font-semibold text-white/60">Список пуст</h2>
          <p className="mt-2 text-sm text-white/30">
            {user
              ? 'Добавьте первую игру через форму сверху'
              : 'Владелец пока не добавил игры в трекер'}
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/30">
            <Search size={26} />
          </div>
          <h3 className="text-base font-semibold text-white/80">Ничего не найдено</h3>
          <p className="mt-1 text-sm text-white/40">
            {searchQuery
              ? `По запросу «${searchQuery}» нет совпадений`
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
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-[#131720] transition-all duration-300 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1"
            >
              {/* Постер 2:3 */}
              <div className="relative aspect-[2/3] w-full overflow-hidden">
                {item.cover_url ? (
                  <Image
                    src={item.cover_url}
                    alt={item.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  />
                ) : (
                  /* Стильная карточка-заглушка 2:3 с градиентом и названием игры */
                  <div className="flex h-full w-full flex-col items-center justify-between p-4 text-center bg-gradient-to-br from-indigo-950/80 via-slate-900 to-[#131720] border border-white/5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/30 mt-4">
                      <Gamepad2 size={20} />
                    </div>

                    <p className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-3 px-1">
                      {item.title}
                    </p>

                    {user ? (
                      <button
                        type="button"
                        onClick={() => openCoverModal(item)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white px-2.5 py-1 text-xs font-medium shadow-lg mb-2"
                      >
                        <ImagePlus size={13} />
                        <span>Обложка</span>
                      </button>
                    ) : (
                      <div className="h-6" />
                    )}
                  </div>
                )}

                {/* Оверлей при наведении */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

                {/* Бейдж статуса (слева сверху) с мгновенным переключением в 1 клик для владельца */}
                <div className="absolute left-2 top-2 z-20">
                  <StatusBadge
                    status={item.status}
                    isOwner={!!user}
                    onStatusChange={(newStatus) => handleStatusChange(item.id, newStatus)}
                    size="sm"
                  />
                </div>

                {/* Кнопки действий владельца (справа сверху при наведении) */}
                {user && (
                  <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <button
                      type="button"
                      title="Сменить обложку"
                      onClick={() => openCoverModal(item)}
                      className="flex items-center justify-center rounded-lg bg-black/70 backdrop-blur-md p-2 text-white/70 shadow-lg transition hover:bg-indigo-600 hover:text-white"
                    >
                      <ImagePlus size={14} />
                    </button>

                    <button
                      type="button"
                      title="Удалить из списка"
                      onClick={() => handleDelete(item)}
                      className="flex items-center justify-center rounded-lg bg-black/70 backdrop-blur-md p-2 text-white/70 shadow-lg transition hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Нижняя часть карточки: Название и Заметка */}
              <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
                <div>
                  <h3
                    className="truncate text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors"
                    title={item.title}
                  >
                    {item.title}
                  </h3>

                  {/* Заметка / Оценка */}
                  {item.note ? (
                    <div
                      onClick={() => user && openNoteModal(item)}
                      className={`mt-1.5 flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/70 ${
                        user ? 'cursor-pointer hover:bg-white/10 hover:text-white' : ''
                      }`}
                      title={user ? 'Нажмите для изменения заметки' : item.note}
                    >
                      <MessageSquare size={11} className="text-indigo-400 shrink-0" />
                      <span className="truncate">{item.note}</span>
                    </div>
                  ) : (
                    user && (
                      <button
                        type="button"
                        onClick={() => openNoteModal(item)}
                        className="mt-1 flex items-center gap-1 text-[11px] text-white/30 hover:text-indigo-300 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MessageSquarePlus size={11} />
                        <span>+ заметка</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка изменения обложки */}
      {coverModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={(e) => !isSavingCover && e.target === e.currentTarget && closeCoverModal()}
        >
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#131720] p-6 shadow-2xl">
            <button
              onClick={closeCoverModal}
              disabled={isSavingCover}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">
              Обложка игры
            </h2>
            <p className="text-xs text-white/40 mb-5 truncate">
              {coverModalItem.title}
            </p>

            {/* Вкладки: Загрузить файл vs Ссылка из интернета */}
            <div className="mb-4 flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setCoverTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium transition-all ${
                  coverTab === 'upload'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Upload size={14} />
                <span>Загрузить с ПК</span>
              </button>
              <button
                type="button"
                onClick={() => setCoverTab('url')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-1.5 text-xs font-medium transition-all ${
                  coverTab === 'url'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <LinkIcon size={14} />
                <span>Ссылка (URL)</span>
              </button>
            </div>

            {/* Содержимое вкладки: Загрузка файла */}
            {coverTab === 'upload' && (
              <div>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setCoverFileInput(f);
                      setCoverPreview(URL.createObjectURL(f));
                      setCoverError('');
                    }
                  }}
                />

                <div
                  onClick={() => editFileInputRef.current?.click()}
                  className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] p-6 hover:border-indigo-500/50 hover:bg-white/5 transition-all text-center"
                >
                  <Upload size={24} className="text-white/40" />
                  <p className="text-xs font-medium text-white/70">
                    Нажмите для выбора файла (поддерживается Ctrl + V)
                  </p>
                  <p className="text-[10px] text-white/30">
                    Автоматически сожмётся в WebP 0.92
                  </p>
                </div>
              </div>
            )}

            {/* Содержимое вкладки: Ссылка из интернета */}
            {coverTab === 'url' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Прямая ссылка на картинку
                </label>
                <input
                  type="url"
                  value={coverUrlInput}
                  onChange={(e) => {
                    setCoverUrlInput(e.target.value);
                    setCoverPreview(e.target.value.trim());
                  }}
                  placeholder="https://images.example.com/poster.jpg"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none transition focus:border-indigo-500 focus:bg-white/10"
                />
                <p className="mt-1 text-[10px] text-white/30">
                  Вставьте URL постера из Steam или интернета
                </p>
              </div>
            )}

            {/* Предпросмотр обложки */}
            {coverPreview && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverPreview}
                    alt="Предпросмотр"
                    className="h-full w-full object-cover"
                    onError={() => setCoverError('Не удалось загрузить картинку по ссылке')}
                  />
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-medium text-white truncate">Предпросмотр обложки</p>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {coverFileInput ? coverFileInput.name : 'Изображение по ссылке'}
                  </p>
                </div>
              </div>
            )}

            {coverError && (
              <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                {coverError}
              </p>
            )}

            {/* Кнопки действий */}
            <div className="mt-6 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
              {coverModalItem.cover_url ? (
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  disabled={isSavingCover}
                  className="text-xs text-red-400 hover:text-red-300 py-2 px-3 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  Удалить обложку
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeCoverModal}
                  disabled={isSavingCover}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-40"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveCover}
                  disabled={isSavingCover || (!coverFileInput && !coverUrlInput.trim() && !coverPreview)}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-all disabled:opacity-40"
                >
                  {isSavingCover ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  <span>Сохранить</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка изменения заметки */}
      {noteModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={(e) => !isSavingNote && e.target === e.currentTarget && setNoteModalItem(null)}
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#131720] p-6 shadow-2xl">
            <button
              onClick={() => setNoteModalItem(null)}
              disabled={isSavingNote}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-bold text-white mb-1">
              Заметка к игре
            </h2>
            <p className="text-xs text-white/40 mb-4 truncate">
              {noteModalItem.title}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveNoteModal();
              }}
              className="space-y-4"
            >
              <input
                autoFocus
                type="text"
                value={noteInputDraft}
                onChange={(e) => setNoteInputDraft(e.target.value)}
                placeholder="Например: 9/10, шедевр, жду DLC..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-500 focus:bg-white/10"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNoteModalItem(null)}
                  disabled={isSavingNote}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSavingNote}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSavingNote ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  <span>Сохранить</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function pluralGames(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'игра';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'игры';
  return 'игр';
}
