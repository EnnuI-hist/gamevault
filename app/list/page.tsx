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
  Sparkles,
  CheckSquare2,
  Square,
  ListTodo,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import StatusBadge, { STATUS_LIST } from '@/components/StatusBadge';
import type { BacklogItem, GameStatus } from '@/lib/types';

type FilterType = 'all' | GameStatus;

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

  // Быстрое добавление игры по Enter / клику
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
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setItems((prev) => [data as BacklogItem, ...prev]);
        setNewTitle('');
        // Сохраняем фокус в инпуте для мгновенного ввода следующей игры
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
            Быстрый персональный трекер прохождения без картинок и лишних кликов
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
            placeholder="Поиск по списку и пометкам..."
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

      {/* Вертикальный табличный список */}
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-white/5 border border-white/5"
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
              ? 'Начните вводить названия игр в поле ввода сверху — можно за пару секунд добавить весь бэклог'
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
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const isCompleted = item.status === 'completed';
            const isEditingThisNote = editingNoteId === item.id;

            return (
              <div
                key={item.id}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all duration-150 ${
                  isCompleted
                    ? 'border-emerald-500/20 bg-emerald-950/[0.12] hover:bg-emerald-950/[0.2]'
                    : 'border-white/5 bg-[#131720] hover:border-white/15 hover:bg-[#161b26]'
                }`}
              >
                {/* Левая часть: чекбокс и название */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Интерактивный чекбокс переключения в "Пройдено" */}
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
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all ${
                      isCompleted
                        ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                        : 'border-white/20 bg-white/5 text-transparent hover:border-indigo-400 hover:bg-indigo-500/10'
                    } ${user ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <Check
                      size={15}
                      className={isCompleted ? 'opacity-100' : 'opacity-0'}
                    />
                  </button>

                  {/* Название игры */}
                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-sm font-semibold transition-colors block truncate ${
                        isCompleted
                          ? 'text-white/40 line-through'
                          : 'text-white group-hover:text-indigo-200'
                      }`}
                      title={item.title}
                    >
                      {item.title}
                    </span>

                    {/* Пометка под названием на мобильных или если пометка есть */}
                    {item.note && !isEditingThisNote && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-white/60">
                        <MessageSquare size={11} className="text-indigo-400 shrink-0" />
                        <span
                          className="truncate italic"
                          title={item.note}
                          onClick={() => {
                            if (user) {
                              setEditingNoteId(item.id);
                              setNoteDraft(item.note);
                            }
                          }}
                        >
                          {item.note}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Правая часть: редактирование пометки, селектор статуса, удаление */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  {/* Инлайн-редактирование пометки */}
                  {isEditingThisNote ? (
                    <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
                      <input
                        autoFocus
                        type="text"
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNote(item.id);
                          if (e.key === 'Escape') setEditingNoteId(null);
                        }}
                        placeholder="Заметка (оценка, мысли)..."
                        className="w-full sm:w-48 rounded-lg border border-indigo-500/40 bg-white/5 px-2.5 py-1 text-xs text-white placeholder-white/30 outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNote(item.id)}
                        className="rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-500"
                        title="Сохранить"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(null)}
                        className="rounded-lg bg-white/10 p-1.5 text-white/50 hover:bg-white/20 hover:text-white"
                        title="Отмена"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    user &&
                    !item.note && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(item.id);
                          setNoteDraft('');
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] text-white/40 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-white/5"
                        title="Добавить пометку"
                      >
                        <MessageSquarePlus size={12} />
                        <span className="hidden md:inline">Пометка</span>
                      </button>
                    )
                  )}

                  {/* Кнопка карандаша, если пометка уже есть */}
                  {user && item.note && !isEditingThisNote && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNoteId(item.id);
                        setNoteDraft(item.note);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-white/30 hover:text-white hover:bg-white/10 rounded-lg"
                      title="Редактировать пометку"
                    >
                      <Edit3 size={13} />
                    </button>
                  )}

                  {/* Селектор статуса в 1 клик */}
                  <StatusBadge
                    status={item.status}
                    isOwner={!!user}
                    onStatusChange={(status) => handleStatusChange(item.id, status)}
                    size="sm"
                  />

                  {/* Кнопка удаления для владельца */}
                  {user && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      title="Удалить из списка"
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
