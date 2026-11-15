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
  ListTodo,
  ImagePlus,
  ImageIcon,
  Upload,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import StatusBadge, { STATUS_LIST } from '@/components/StatusBadge';
import type { BacklogItem, GameStatus } from '@/lib/types';

type FilterType = 'all' | GameStatus;

/** Конвертирует загруженное изображение в WebP через Canvas */
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

  // Форма быстрого добавления
  const [newTitle, setNewTitle] = useState('');
  const [newStatus, setNewStatus] = useState<GameStatus>('planned');
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Поиск и фильтры
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Инлайн редактирование пометки
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Модалка обложки
  const [coverModalItem, setCoverModalItem] = useState<BacklogItem | null>(null);
  const [coverTab, setCoverTab] = useState<'upload' | 'url'>('upload');
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [coverFileInput, setCoverFileInput] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [isSavingCover, setIsSavingCover] = useState(false);
  const [coverError, setCoverError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, []);

  // Быстрое добавление игры по Enter / кнопке
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || isAdding) return;

    setIsAdding(true);

    try {
      const { data, error } = await supabase
        .from('game_backlog')
        .insert({
          title,
          status: newStatus,
          note: '',
          cover_url: null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setItems((prev) => [data as BacklogItem, ...prev]);
        setNewTitle('');
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error('Ошибка добавления игры в бэклог:', err);
      alert('Не удалось добавить игру в список');
    } finally {
      setIsAdding(false);
    }
  };

  // Мгновенное переключение статуса
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

  // Чекбокс: переключение в "Пройдено" и обратно
  const handleToggleComplete = async (item: BacklogItem) => {
    if (!user) return;
    const nextStatus: GameStatus = item.status === 'completed' ? 'planned' : 'completed';
    await handleStatusChange(item.id, nextStatus);
  };

  // Сохранение пометки
  const handleSaveNote = async (id: string) => {
    const cleanNote = noteDraft.trim();
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note: cleanNote } : item))
    );
    setEditingNoteId(null);

    const { error } = await supabase
      .from('game_backlog')
      .update({ note: cleanNote })
      .eq('id', id);

    if (error) {
      console.error('Ошибка сохранения пометки:', error);
      loadBacklog();
    }
  };

  // Удаление строки
  const handleDelete = async (item: BacklogItem) => {
    if (!confirm(`Удалить «${item.title}» из списка?`)) return;

    setItems((prev) => prev.filter((i) => i.id !== item.id));

    const { error } = await supabase
      .from('game_backlog')
      .delete()
      .eq('id', item.id);

    if (error) {
      console.error('Ошибка удаления игры:', error);
      loadBacklog();
      alert('Не удалось удалить строку');
    }
  };

  // Открытие модалки обложки
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

  // Обработка выбора файла обложки
  const handleCoverFileChange = (file: File) => {
    setCoverFileInput(file);
    setCoverError('');
    setCoverPreview(URL.createObjectURL(file));
  };

  // Сохранение обложки (загрузка файла или прямая ссылка)
  const handleSaveCover = async () => {
    if (!coverModalItem) return;
    setIsSavingCover(true);
    setCoverError('');

    try {
      let finalCoverUrl: string | null = null;

      if (coverTab === 'upload') {
        if (!coverFileInput && !coverPreview) {
          finalCoverUrl = null;
        } else if (coverFileInput) {
          // Сжатие в WebP
          const compressedBlob = await compressCoverToWebP(coverFileInput);
          const ext = 'webp';
          const storagePath = `backlog-covers/${coverModalItem.id}-${Date.now()}.${ext}`;

          const { error: upErr } = await supabase.storage
            .from('screenshots')
            .upload(storagePath, compressedBlob, {
              cacheControl: '3600',
              upsert: true,
              contentType: 'image/webp',
            });

          if (upErr) throw upErr;

          const { data: { publicUrl } } = supabase.storage
            .from('screenshots')
            .getPublicUrl(storagePath);

          finalCoverUrl = publicUrl;
        } else {
          finalCoverUrl = coverModalItem.cover_url || null;
        }
      } else {
        // Прямая ссылка
        const trimmed = coverUrlInput.trim();
        finalCoverUrl = trimmed || null;
      }

      // Обновляем в БД
      const { error: dbErr } = await supabase
        .from('game_backlog')
        .update({ cover_url: finalCoverUrl })
        .eq('id', coverModalItem.id);

      if (dbErr) throw dbErr;

      // Обновляем состояние
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

  // Удаление обложки
  const handleRemoveCover = async () => {
    if (!coverModalItem) return;
    setIsSavingCover(true);
    try {
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
      label: 'В процессе',
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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Шапка раздела */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Список игр (Бэклог)
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
              <ListTodo size={12} />
              Трекер
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-white/40">
            Персональный трекер прохождения с постерами, статусами и быстрыми пометками
          </p>
        </div>
      </div>

      {/* Быстрое добавление (только для владельца) */}
      {user && (
        <form
          onSubmit={handleQuickAdd}
          className="mb-8 rounded-2xl border border-white/10 bg-[#131720] p-3 sm:p-4 shadow-xl backdrop-blur-sm"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Быстро добавить игру... (нажми Enter)"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-500 focus:bg-white/10"
              />
            </div>

            {/* Выбор статуса по умолчанию */}
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
        </form>
      )}

      {/* Панель фильтров и поиска */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Вкладки-фильтры по статусам */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
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
        <div className="relative w-full md:w-64">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию и пометкам..."
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

      {/* Вертикальный табличный список (просторные карточки) */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-white/5 border border-white/5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/30">
            <ListTodo size={28} />
          </div>
          <h3 className="text-base font-semibold text-white/70">
            Список пуст
          </h3>
          <p className="mt-1 text-xs text-white/30 max-w-sm">
            {user
              ? 'Начните вводить названия игр в поле ввода сверху — можно за пару секунд накидать весь бэклог'
              : 'Владелец пока не добавил игры в трекер'}
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white/30">
            <Search size={22} />
          </div>
          <h3 className="text-sm font-semibold text-white/70">
            Ничего не найдено
          </h3>
          <p className="mt-1 text-xs text-white/30">
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
              className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isCompleted = item.status === 'completed';
            const isEditingThisNote = editingNoteId === item.id;

            return (
              <div
                key={item.id}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
                  isCompleted
                    ? 'border-emerald-500/30 bg-emerald-950/[0.16] hover:bg-emerald-950/[0.22] hover:border-emerald-500/40 shadow-sm'
                    : 'border-white/5 bg-[#131720] hover:border-white/15 hover:bg-[#161b26] shadow-sm'
                }`}
              >
                {/* Левая часть: Чекбокс + Обложка 52x70 + Название и Заметка */}
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                  {/* Чекбокс переключения в "Пройдено" */}
                  <button
                    type="button"
                    disabled={!user}
                    onClick={() => handleToggleComplete(item)}
                    title={
                      !user
                        ? isCompleted
                          ? 'Пройдено'
                          : 'Не завершено'
                        : isCompleted
                        ? 'Снять отметку «Пройдено»'
                        : 'Отметить как «Пройдено»'
                    }
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition-all ${
                      isCompleted
                        ? 'border-emerald-500/60 bg-emerald-500/25 text-emerald-400 shadow-sm shadow-emerald-500/20'
                        : 'border-white/20 bg-white/5 text-transparent hover:border-indigo-400 hover:bg-indigo-500/10'
                    } ${user ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <Check
                      size={16}
                      className={isCompleted ? 'opacity-100' : 'opacity-0'}
                    />
                  </button>

                  {/* Мини-обложка (52×70 px) */}
                  <div className="relative shrink-0">
                    {item.cover_url ? (
                      <div
                        onClick={() => user && openCoverModal(item)}
                        className={`group/cover relative h-[70px] w-[52px] overflow-hidden rounded-lg border border-white/10 bg-black/40 shadow-md ${
                          user ? 'cursor-pointer' : ''
                        }`}
                        title={user ? 'Нажмите, чтобы изменить обложку' : undefined}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.cover_url}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover/cover:scale-105"
                        />
                        {user && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover/cover:opacity-100">
                            <Edit3 size={14} className="text-white" />
                          </div>
                        )}
                      </div>
                    ) : user ? (
                      <button
                        type="button"
                        onClick={() => openCoverModal(item)}
                        title="Добавить обложку игры"
                        className={`flex h-[70px] w-[52px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed transition-all ${
                          isCompleted
                            ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400 hover:bg-emerald-500/15 text-emerald-400/60 hover:text-emerald-300'
                            : 'border-white/20 bg-white/[0.03] hover:border-indigo-400 hover:bg-white/10 text-white/40 hover:text-indigo-300'
                        }`}
                      >
                        <ImagePlus size={16} />
                        <span className="text-[9px] font-medium leading-none">Фото</span>
                      </button>
                    ) : (
                      <div className="flex h-[70px] w-[52px] items-center justify-center rounded-lg border border-white/5 bg-white/[0.02] text-white/15">
                        <ImageIcon size={18} />
                      </div>
                    )}
                  </div>

                  {/* Название игры и пометка (крупный чёткий светлый шрифт без зачёркивания) */}
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-base sm:text-lg font-bold text-white group-hover:text-indigo-200 transition-colors leading-snug"
                      title={item.title}
                    >
                      {item.title}
                    </h3>

                    {/* Заметка под названием */}
                    {isEditingThisNote ? (
                      <div className="mt-2 flex items-center gap-1.5 max-w-md">
                        <input
                          autoFocus
                          type="text"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNote(item.id);
                            if (e.key === 'Escape') setEditingNoteId(null);
                          }}
                          placeholder="Заметка (оценка, впечатления, мысли)..."
                          className="w-full rounded-lg border border-indigo-500/40 bg-white/5 px-2.5 py-1 text-xs sm:text-sm text-white placeholder-white/30 outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNote(item.id)}
                          className="rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-500"
                          title="Сохранить"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="rounded-lg bg-white/10 p-1.5 text-white/50 hover:bg-white/20 hover:text-white"
                          title="Отмена"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : item.note ? (
                      <div
                        onClick={() => {
                          if (user) {
                            setEditingNoteId(item.id);
                            setNoteDraft(item.note);
                          }
                        }}
                        className={`mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-white/75 bg-white/5 border border-white/5 ${
                          user ? 'cursor-pointer hover:bg-white/10 hover:text-white' : ''
                        }`}
                        title={user ? 'Нажмите для редактирования заметки' : undefined}
                      >
                        <MessageSquare size={12} className="text-indigo-400 shrink-0" />
                        <span className="leading-relaxed">{item.note}</span>
                        {user && (
                          <Edit3 size={11} className="text-white/30 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    ) : (
                      user && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingNoteId(item.id);
                            setNoteDraft('');
                          }}
                          className="mt-1 flex items-center gap-1 text-xs text-white/30 hover:text-indigo-300 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MessageSquarePlus size={12} />
                          <span>Добавить заметку</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Правая часть: Селектор статуса + Удаление */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <StatusBadge
                    status={item.status}
                    isOwner={!!user}
                    onStatusChange={(status) => handleStatusChange(item.id, status)}
                    size="md"
                  />

                  {user && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      title="Удалить из списка"
                      className="rounded-lg p-2 text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модалка установки обложки (Загрузка файла или прямая ссылка) */}
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
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCoverFileChange(f);
                  }}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] p-6 hover:border-indigo-500/50 hover:bg-white/5 transition-all text-center"
                >
                  <Upload size={24} className="text-white/40" />
                  <p className="text-xs font-medium text-white/70">
                    Нажмите для выбора файла (PNG, JPG, WebP)
                  </p>
                  <p className="text-[10px] text-white/30">
                    Автоматически сожмётся в WebP для быстрой загрузки
                  </p>
                </div>
              </div>
            )}

            {/* Содержимое вкладки: Ссылка из интернета */}
            {coverTab === 'url' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-white/60">
                  Прямая ссылка на постер
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
                  Вставьте URL картинки из Steam, Игромании или интернета
                </p>
              </div>
            )}

            {/* Предпросмотр обложки */}
            {coverPreview && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5">
                <div className="relative h-[70px] w-[52px] shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
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
                    {coverFileInput ? `${coverFileInput.name}` : 'Изображение по ссылке'}
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
    </div>
  );
}
