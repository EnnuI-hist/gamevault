'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  X,
  CheckCircle2,
  Gamepad2,
  Clock,
  XCircle,
  Trash2,
  Check,
  MessageSquare,
  MessageSquarePlus,
  Loader2,
  ImagePlus,
  Upload,
  Link as LinkIcon,
  Crown,
  Sparkles,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { resolveMediaUrl } from '@/lib/utils';
import StatusBadge, { STATUS_LIST } from '@/components/StatusBadge';
import TiltCard from '@/components/TiltCard';
import type { BacklogItem, GameStatus } from '@/lib/types';

type FilterType = 'all' | GameStatus;

const BADGE_PRESETS = [
  { label: '👑 Шедевр', value: '👑 Шедевр' },
  { label: '🏆 Платина / 100%', value: '🏆 Платина / 100%' },
  { label: '⚔️ Топ боёвка', value: '⚔️ Топ боёвка' },
  { label: '📜 Лучший сюжет', value: '📜 Лучший сюжет' },
  { label: '💎 Скрытый алмаз', value: '💎 Скрытый алмаз' },
  { label: '🌌 Атмосфера 10/10', value: '🌌 Атмосфера 10/10' },
  { label: '🔥 Игра года', value: '🔥 Игра года' },
];

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

const BACKLOG_CACHE_KEY = 'gamevault_backlog_items';
const VAULT_STATS_CACHE_KEY = 'gamevault_vault_stats';

export default function BacklogPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [vaultStats, setVaultStats] = useState<{ screenshots: number; saves: number }>({
    screenshots: 0,
    saves: 0,
  });

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

  // Модалка награды / Зал славы
  const [badgeModalItem, setBadgeModalItem] = useState<BacklogItem | null>(null);
  const [selectedBadge, setSelectedBadge] = useState('');
  const [customBadgeInput, setCustomBadgeInput] = useState('');
  const [isSavingBadge, setIsSavingBadge] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  const updateItemsAndCache = (newItems: BacklogItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem(BACKLOG_CACHE_KEY, JSON.stringify(newItems));
    } catch (e) {
      console.warn('Ошибка сохранения кэша списка игр:', e);
    }
  };

  const loadBacklog = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      // Оптимизированный запрос к таблице game_backlog
      const { data, error } = await supabase
        .from('game_backlog')
        .select('id, title, status, note, cover_url, badge, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка загрузки списка игр:', error);
        setErrorMessage(error.message || JSON.stringify(error));
        return;
      }

      if (!error && data) {
        setErrorMessage('');
        const backlogData = data as BacklogItem[];
        setItems(backlogData);
        try {
          localStorage.setItem(BACKLOG_CACHE_KEY, JSON.stringify(backlogData));
        } catch (e) {
          console.warn('Ошибка записи кэша списка игр:', e);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки списка игр:', err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchVaultStats = async () => {
    try {
      const [scRes, svRes] = await Promise.all([
        supabase.from('screenshots').select('id', { count: 'exact', head: true }),
        supabase.from('game_saves').select('id', { count: 'exact', head: true }),
      ]);
      const stats = {
        screenshots: scRes.count ?? 0,
        saves: svRes.count ?? 0,
      };
      setVaultStats(stats);
      try {
        localStorage.setItem(VAULT_STATS_CACHE_KEY, JSON.stringify(stats));
      } catch (e) {
        console.warn('Ошибка записи кэша статистики:', e);
      }
    } catch (e) {
      console.warn('Ошибка загрузки статистики хранилища:', e);
    }
  };

  useEffect(() => {
    // Мгновенный кэш (Stale-While-Revalidate): рендерим сразу из localStorage без задержек
    let hasCache = false;
    try {
      const cached = localStorage.getItem(BACKLOG_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          setLoading(false);
          hasCache = true;
        }
      }
      const cachedStats = localStorage.getItem(VAULT_STATS_CACHE_KEY);
      if (cachedStats) {
        setVaultStats(JSON.parse(cachedStats));
      }
    } catch (e) {
      console.warn('Ошибка чтения кэша списка игр:', e);
    }

    // Фоновое обновление из базы данных Supabase
    loadBacklog(!hasCache);
    fetchVaultStats();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadBacklog(false);
        fetchVaultStats();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', () => loadBacklog(false));

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', () => loadBacklog(false));
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
        setCoverFileInput(file);
        setCoverPreview(URL.createObjectURL(file));
        setCoverTab('upload');
        setCoverError('');
      } else if (user) {
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
        updateItemsAndCache([data as BacklogItem, ...items]);
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
    const nextItems = items.map((item) =>
      item.id === id ? { ...item, status: nextStatus } : item
    );
    updateItemsAndCache(nextItems);

    const { error } = await supabase
      .from('game_backlog')
      .update({ status: nextStatus })
      .eq('id', id);

    if (error) {
      console.error('Ошибка обновления статуса:', error);
      updateItemsAndCache(prevItems);
      alert('Не удалось обновить статус');
    }
  };

  // Удаление игры
  const handleDelete = async (item: BacklogItem) => {
    if (!confirm(`Удалить «${item.title}» из списка?`)) return;

    updateItemsAndCache(items.filter((i) => i.id !== item.id));

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

      updateItemsAndCache(
        items.map((i) =>
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

      updateItemsAndCache(
        items.map((i) =>
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

      updateItemsAndCache(
        items.map((i) => (i.id === noteModalItem.id ? { ...i, note: clean } : i))
      );

      setNoteModalItem(null);
    } catch (err) {
      console.error('Ошибка сохранения заметки:', err);
      alert('Не удалось сохранить заметку');
    } finally {
      setIsSavingNote(false);
    }
  };

  // Управление модалкой наград (Зал Славы)
  const openBadgeModal = (item: BacklogItem) => {
    setBadgeModalItem(item);
    setSelectedBadge(item.badge || '');
    setCustomBadgeInput(
      item.badge && !BADGE_PRESETS.some((p) => p.value === item.badge)
        ? item.badge
        : ''
    );
  };

  const handleSaveBadge = async (badgeValue: string | null) => {
    if (!badgeModalItem) return;
    setIsSavingBadge(true);
    const cleanBadge = badgeValue?.trim() || null;

    try {
      const { error } = await supabase
        .from('game_backlog')
        .update({ badge: cleanBadge })
        .eq('id', badgeModalItem.id);

      if (error) throw error;

      updateItemsAndCache(
        items.map((i) =>
          i.id === badgeModalItem.id ? { ...i, badge: cleanBadge } : i
        )
      );

      setBadgeModalItem(null);
    } catch (err) {
      console.error('Ошибка сохранения награды:', err);
      alert('Не удалось сохранить награду');
    } finally {
      setIsSavingBadge(false);
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

  const completedPercentage =
    counts.all > 0 ? Math.round((counts.completed / counts.all) * 100) : 0;
  const compPct = counts.all > 0 ? (counts.completed / counts.all) * 100 : 0;
  const playPct = counts.all > 0 ? (counts.playing / counts.all) * 100 : 0;
  const planPct = counts.all > 0 ? (counts.planned / counts.all) * 100 : 0;
  const dropPct = counts.all > 0 ? (counts.dropped / counts.all) * 100 : 0;

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
      activeClass:
        'border border-[var(--neon-badge-border)] bg-[var(--neon-badge-bg)] text-[var(--neon-text)] shadow-[0_0_14px_rgba(var(--neon-primary-rgb),0.35)]',
    },
    {
      id: 'completed',
      label: 'Пройдено',
      icon: CheckCircle2,
      count: counts.completed,
      activeClass:
        'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.3)]',
    },
    {
      id: 'playing',
      label: 'Прохожу',
      icon: Gamepad2,
      count: counts.playing,
      activeClass:
        'border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.3)]',
    },
    {
      id: 'planned',
      label: 'В планах',
      icon: Clock,
      count: counts.planned,
      activeClass:
        'border border-sky-500/40 bg-sky-500/15 text-sky-300 shadow-[0_0_14px_rgba(56,189,248,0.3)]',
    },
    {
      id: 'dropped',
      label: 'Дропнуто',
      icon: XCircle,
      count: counts.dropped,
      activeClass:
        'border border-rose-500/40 bg-rose-500/15 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.3)]',
    },
  ];

  // Специфический статус-ореол постера
  const getStatusGlow = (status: GameStatus) => {
    switch (status) {
      case 'completed':
        return 'border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.22)] ring-1 ring-emerald-400/25';
      case 'playing':
        return 'border border-amber-500/60 shadow-[0_0_22px_rgba(245,158,11,0.28)] ring-1 ring-amber-400/30';
      case 'planned':
        return 'border border-sky-500/40 shadow-[0_0_16px_rgba(56,189,248,0.18)] ring-1 ring-sky-400/20';
      case 'dropped':
        return 'border border-rose-500/35 shadow-[0_0_12px_rgba(244,63,94,0.14)] ring-1 ring-rose-400/15';
      default:
        return 'border border-white/10';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Шапка страницы трекера */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-fantasy text-3xl sm:text-4xl font-extrabold tracking-wide text-white">
              Список игр
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full neon-badge px-3 py-1 text-xs font-mono font-medium">
              <Sparkles size={12} />
              Neon Cyber Showcase
            </span>
          </div>
          <p className="mt-1 font-mono text-sm text-white/40">
            {items.length > 0
              ? `${items.length} ${pluralGames(items.length)} в коллекции`
              : 'Коллекция пуста'}
          </p>
        </div>
      </div>

      {/* Bento-панель статистики (Steam Big Picture / Cyber Neon) */}
      <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0e121a]/80 via-[#0b0e15]/80 to-[#080a0f]/80 p-5 shadow-2xl backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Блок 1: Прогресс прохождения библиотеки */}
          <div className="md:col-span-4 rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-md p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-white/50 font-medium">
                Прогресс трекера
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-mono text-emerald-400">
                {counts.completed} / {counts.all}
              </span>
            </div>
            <div className="my-3 flex items-baseline gap-2">
              <span
                className="font-fantasy text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text tracking-tight"
                style={{ backgroundImage: 'var(--neon-gradient)' }}
              >
                {completedPercentage}%
              </span>
              <span className="text-xs text-white/40">пройдено</span>
            </div>
            <div className="text-[11px] text-white/40">
              {counts.playing > 0 ? (
                <span>
                  🔥 Сейчас в процессе:{' '}
                  <strong className="font-mono text-[var(--neon-text)]">{counts.playing}</strong>
                </span>
              ) : (
                <span>
                  {counts.all === 0
                    ? 'Добавьте первую игру в список'
                    : 'Все начатые игры пройдены!'}
                </span>
              )}
            </div>
          </div>

          {/* Блок 2: Сегментированный прогресс-бар по 4 статусам */}
          <div className="md:col-span-5 rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-md p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-white/50 font-medium">
                Статусы коллекции
              </span>
              <span className="font-mono text-xs text-white/40">
                {counts.all} {pluralGames(counts.all)}
              </span>
            </div>

            {/* Сегментированная полоса прогресса */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/5 flex p-0.5 gap-0.5 border border-white/5">
              {counts.all > 0 ? (
                <>
                  {compPct > 0 && (
                    <div
                      style={{ width: `${compPct}%` }}
                      title={`Пройдено: ${counts.completed} (${Math.round(compPct)}%)`}
                      className="h-full rounded-l-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    />
                  )}
                  {playPct > 0 && (
                    <div
                      style={{ width: `${playPct}%` }}
                      title={`Прохожу: ${counts.playing} (${Math.round(playPct)}%)`}
                      className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    />
                  )}
                  {planPct > 0 && (
                    <div
                      style={{ width: `${planPct}%` }}
                      title={`В планах: ${counts.planned} (${Math.round(planPct)}%)`}
                      className="h-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                    />
                  )}
                  {dropPct > 0 && (
                    <div
                      style={{ width: `${dropPct}%` }}
                      title={`Дропнуто: ${counts.dropped} (${Math.round(dropPct)}%)`}
                      className="h-full rounded-r-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                    />
                  )}
                </>
              ) : (
                <div className="h-full w-full rounded-full bg-white/10" />
              )}
            </div>

            {/* Легенда */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-white/60 truncate">Пройдено:</span>
                <span className="font-mono font-semibold text-emerald-400">
                  {counts.completed}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-white/60 truncate">Прохожу:</span>
                <span className="font-mono font-semibold text-amber-400">
                  {counts.playing}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
                <span className="text-white/60 truncate">В планах:</span>
                <span className="font-mono font-semibold text-sky-400">
                  {counts.planned}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                <span className="text-white/60 truncate">Дроп:</span>
                <span className="font-mono font-semibold text-rose-400">
                  {counts.dropped}
                </span>
              </div>
            </div>
          </div>

          {/* Блок 3: Хранилище Game archive (2K Скриншоты и Сейвы) */}
          <div className="md:col-span-3 rounded-xl border border-white/5 bg-white/[0.03] backdrop-blur-md p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-white/50 font-medium">
                Хранилище Vault
              </span>
              <Link
                href="/"
                className="inline-flex items-center gap-0.5 text-[11px] text-[var(--neon-text)] hover:opacity-80 transition-opacity"
              >
                <span>Витрина</span>
                <ArrowUpRight size={12} />
              </Link>
            </div>

            <div className="my-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-black/30 p-2 border border-white/5">
                <p className="font-mono text-xl font-bold text-[var(--neon-text)]">
                  {vaultStats.screenshots}
                </p>
                <p className="text-[10px] text-white/40">2K скринов/видео</p>
              </div>
              <div className="rounded-lg bg-black/30 p-2 border border-white/5">
                <p className="font-mono text-xl font-bold text-[var(--neon-secondary)]">
                  {vaultStats.saves}
                </p>
                <p className="text-[10px] text-white/40">бэкапов сейвов</p>
              </div>
            </div>

            <p className="text-[11px] text-white/40 truncate">
              Полноразмерные медиа и бэкапы
            </p>
          </div>
        </div>
      </div>

      {/* Форма быстрого добавления (только для владельца) */}
      {user && (
        <form
          onSubmit={handleAddGame}
          className="mb-8 rounded-2xl border border-white/10 bg-[#10141d]/80 p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-3.5"
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
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition neon-ring-focus focus:bg-white/10"
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
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? `${opt.badgeClass} ring-1 ring-white/20 shadow-sm font-semibold`
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
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all duration-200 active:scale-95 shrink-0 ${
                newCoverPreview || newCoverUrl.trim()
                  ? 'neon-badge'
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
              className="flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-50 shrink-0 neon-btn-primary active:scale-95 cursor-pointer shadow-md"
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none transition neon-ring-focus focus:bg-white/10"
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
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200 active:scale-95 shrink-0"
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none transition neon-ring-focus focus:bg-white/10"
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
        {/* Вкладки-фильтры по статусам (Стеклянная сегментированная капсула) */}
        <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl border border-white/10 bg-[#0d111a]/80 backdrop-blur-md overflow-x-auto max-w-full scrollbar-none shadow-inner">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium transition-all duration-200 active:scale-95 ${
                  isActive
                    ? `${tab.activeClass} font-semibold`
                    : 'border border-transparent bg-transparent text-white/60 hover:bg-white/5 hover:border-white/10 hover:text-white'
                }`}
              >
                {Icon && (
                  <Icon
                    size={14}
                    className={isActive ? 'drop-shadow-[0_0_6px_currentColor]' : 'text-white/60'}
                  />
                )}
                <span>{tab.label}</span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-mono font-semibold ${
                    isActive
                      ? 'bg-black/35 text-current'
                      : 'bg-white/5 text-white/50'
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
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-9 py-2 text-sm text-white placeholder-white/30 outline-none transition neon-ring-focus focus:bg-white/10"
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

      {/* Адаптивная сетка вертикальных постеров 2:3 с 3D Tilt и подсветкой */}
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
      ) : errorMessage ? (
        <div className="my-10 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center backdrop-blur-md">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
            <AlertCircle size={26} />
          </div>
          <h3 className="font-fantasy text-base font-semibold text-red-300">Ошибка подключения к базе</h3>
          <p className="mt-2 max-w-xl mx-auto text-xs font-mono text-red-400 break-all leading-relaxed bg-black/40 p-3 rounded-xl border border-red-500/20">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => loadBacklog(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/20 px-4 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/30 active:scale-95"
          >
            Повторить запрос
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Gamepad2 size={36} className="text-white/30" />
          </div>
          <h2 className="font-fantasy text-xl font-semibold text-white/60">Список пуст</h2>
          <p className="mt-2 text-sm text-white/30">
            {user
              ? 'Добавьте первую игру через форму сверху'
              : 'Коллекция пустая'}
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/30">
            <Search size={26} />
          </div>
          <h3 className="font-fantasy text-base font-semibold text-white/80">Ничего не найдено</h3>
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
          {filteredItems.map((item, index) => {
            const isPriority = index < 6;
            const resolvedCover = resolveMediaUrl(item.cover_url);
            return (
              <div key={item.id} className="group relative">
                <TiltCard
                  coverUrl={resolvedCover}
                  statusGlowClass={getStatusGlow(item.status)}
                  className="h-full flex flex-col justify-between"
                >
                  {/* Постер 2:3 */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0a0d13]">
                    {resolvedCover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={resolvedCover}
                        alt={item.title}
                        loading={isPriority ? 'eager' : 'lazy'}
                        decoding="async"
                        className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          item.status === 'dropped'
                            ? 'saturate-50 opacity-80 group-hover:saturate-75 group-hover:opacity-100'
                            : ''
                        }`}
                      />
                    ) : (
                    /* Стильная карточка-заглушка 2:3 с темным фэнтези градиентом */
                    <div className="flex h-full w-full flex-col items-center justify-between p-4 text-center bg-gradient-to-br from-[var(--neon-badge-bg)] via-slate-900 to-[#10141d]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/30 mt-4">
                        <Gamepad2 size={20} />
                      </div>

                      <p className="font-fantasy font-bold text-white text-sm sm:text-base leading-snug line-clamp-3 px-1">
                        {item.title}
                      </p>

                      {user ? (
                        <button
                          type="button"
                          onClick={() => openCoverModal(item)}
                          className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 rounded-xl neon-btn-primary active:scale-95 text-white px-3 py-1.5 text-xs font-medium shadow-lg mb-2"
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

                  {/* Бейдж статуса (слева сверху) с мгновенным переключением в 1 клик для владельца */}
                  <div className="absolute left-2 top-2 z-20">
                    <StatusBadge
                      status={item.status}
                      isOwner={!!user}
                      onStatusChange={(newStatus) =>
                        handleStatusChange(item.id, newStatus)
                      }
                      size="sm"
                    />
                  </div>

                  {/* Кнопки действий владельца (справа сверху при наведении - лаунчерный стиль) */}
                  {user && (
                    <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <button
                        type="button"
                        title="Присвоить награду (Зал Славы)"
                        onClick={() => openBadgeModal(item)}
                        className={`flex items-center justify-center rounded-xl border bg-[#0d111a]/80 backdrop-blur-md p-2 shadow-lg transition-all duration-200 hover:border-[var(--neon-border)] hover:bg-[var(--neon-badge-bg)] hover:text-[var(--neon-text)] hover:shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.35)] active:scale-95 ${
                          item.badge
                            ? 'border-[var(--neon-border)] text-[var(--neon-text)] shadow-[0_0_10px_rgba(var(--neon-primary-rgb),0.3)]'
                            : 'border-white/15 text-white/80'
                        }`}
                      >
                        <Crown size={14} />
                      </button>

                      <button
                        type="button"
                        title="Сменить обложку"
                        onClick={() => openCoverModal(item)}
                        className="flex items-center justify-center rounded-xl border border-white/15 bg-[#0d111a]/80 backdrop-blur-md p-2 text-white/80 shadow-lg transition-all duration-200 hover:border-[var(--neon-border)] hover:bg-[var(--neon-badge-bg)] hover:text-[var(--neon-text)] hover:shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.35)] active:scale-95"
                      >
                        <ImagePlus size={14} />
                      </button>

                      <button
                        type="button"
                        title="Удалить из списка"
                        onClick={() => handleDelete(item)}
                        className="flex items-center justify-center rounded-xl border border-white/15 bg-[#0d111a]/80 backdrop-blur-md p-2 text-white/80 shadow-lg transition-all duration-200 hover:border-red-500/60 hover:bg-red-500/20 hover:text-red-300 hover:shadow-[0_0_12px_rgba(239,68,68,0.35)] active:scale-95"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {/* Медалька / Награда на постере («Зал Славы») */}
                  {item.badge && (
                    <div className="absolute bottom-2 left-2 right-2 z-20 flex justify-center pointer-events-none">
                      <div className="badge-gold-shimmer rounded-lg border border-yellow-200/90 px-2.5 py-0.5 text-center shadow-[0_2px_12px_rgba(245,158,11,0.5)] backdrop-blur-md">
                        <span className="font-fantasy text-xs font-black tracking-wide text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center gap-1">
                          {item.badge}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Нижняя часть карточки: Название и Заметка */}
                <div className="p-3 bg-[#0d1017]/80 backdrop-blur-md border-t border-white/5 flex flex-col gap-1.5 flex-1 justify-between">
                  <div>
                    <h3
                      className="truncate font-fantasy text-sm font-bold text-white group-hover:text-[var(--neon-text)] transition-colors tracking-wide"
                      title={item.title}
                    >
                      {item.title}
                    </h3>

                    {/* Заметка / Оценка */}
                    {item.note ? (
                      <div
                        onClick={() => user && openNoteModal(item)}
                        className={`mt-1.5 flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-[11px] text-white/70 ${
                          user
                            ? 'cursor-pointer hover:bg-white/10 hover:text-white'
                            : ''
                        }`}
                        title={
                          user ? 'Нажмите для изменения заметки' : item.note
                        }
                      >
                        <MessageSquare
                          size={11}
                          className="text-[var(--neon-text)] shrink-0"
                        />
                        <span className="truncate">{item.note}</span>
                      </div>
                    ) : (
                      user && (
                        <button
                          type="button"
                          onClick={() => openNoteModal(item)}
                          className="mt-1 flex items-center gap-1 text-[11px] text-white/30 hover:text-[var(--neon-text)] transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <MessageSquarePlus size={11} />
                          <span>+ заметка</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </TiltCard>
            </div>
          );
        })}
        </div>
      )}

      {/* Модалка изменения обложки (Лаунчерное стекло) */}
      {coverModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) =>
            !isSavingCover && e.target === e.currentTarget && closeCoverModal()
          }
        >
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d111a]/95 backdrop-blur-xl p-6 shadow-2xl">
            <button
              onClick={closeCoverModal}
              disabled={isSavingCover}
              className="absolute right-4 top-4 rounded-xl border border-transparent p-1.5 text-white/40 transition-all duration-200 hover:border-white/10 hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40"
            >
              <X size={18} />
            </button>

            <h2 className="font-fantasy text-lg font-bold text-white mb-1">
              Обложка игры
            </h2>
            <p className="text-xs text-white/40 mb-5 truncate font-mono">
              {coverModalItem.title}
            </p>

            {/* Вкладки: Загрузить файл vs Ссылка из интернета (Стеклянная капсула) */}
            <div className="mb-4 flex items-center gap-1 rounded-xl border border-white/10 bg-[#080b11]/80 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setCoverTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all duration-200 active:scale-95 ${
                  coverTab === 'upload'
                    ? 'border border-[var(--neon-badge-border)] bg-[var(--neon-badge-bg)] text-[var(--neon-text)] shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.3)] font-semibold'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Upload size={14} />
                <span>Загрузить с ПК</span>
              </button>
              <button
                type="button"
                onClick={() => setCoverTab('url')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all duration-200 active:scale-95 ${
                  coverTab === 'url'
                    ? 'border border-[var(--neon-badge-border)] bg-[var(--neon-badge-bg)] text-[var(--neon-text)] shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.3)] font-semibold'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
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
                  className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] p-6 hover:border-[var(--neon-primary)] hover:bg-white/5 transition-all text-center"
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
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none transition neon-ring-focus focus:bg-white/10"
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
                    src={resolveMediaUrl(coverPreview)}
                    alt="Предпросмотр"
                    className="h-full w-full object-cover"
                    onError={() =>
                      setCoverError('Не удалось загрузить картинку по ссылке')
                    }
                  />
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-medium text-white truncate">
                    Предпросмотр обложки
                  </p>
                  <p className="text-[11px] text-white/40 mt-0.5 font-mono">
                    {coverFileInput
                      ? coverFileInput.name
                      : 'Изображение по ссылке'}
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
                  className="text-xs text-red-400 hover:text-red-300 py-2 px-3 rounded-xl border border-transparent hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-200 active:scale-95"
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
                  className="rounded-xl border border-white/15 bg-[#0d111a]/80 backdrop-blur-md px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-200 active:scale-95 disabled:opacity-40"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveCover}
                  disabled={
                    isSavingCover ||
                    (!coverFileInput && !coverUrlInput.trim() && !coverPreview)
                  }
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium text-white transition-all duration-200 disabled:opacity-40 neon-btn-primary active:scale-95 cursor-pointer shadow-md"
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

      {/* Модалка изменения заметки (Лаунчерное стекло) */}
      {noteModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) =>
            !isSavingNote &&
            e.target === e.currentTarget &&
            setNoteModalItem(null)
          }
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d111a]/95 backdrop-blur-xl p-6 shadow-2xl">
            <button
              onClick={() => setNoteModalItem(null)}
              disabled={isSavingNote}
              className="absolute right-4 top-4 rounded-xl border border-transparent p-1.5 text-white/40 transition-all duration-200 hover:border-white/10 hover:bg-white/10 hover:text-white active:scale-95"
            >
              <X size={18} />
            </button>

            <h2 className="font-fantasy text-base font-bold text-white mb-1">
              Заметка к игре
            </h2>
            <p className="text-xs text-white/40 mb-4 truncate font-mono">
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
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition neon-ring-focus focus:bg-white/10"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNoteModalItem(null)}
                  disabled={isSavingNote}
                  className="rounded-xl border border-white/15 bg-[#0d111a]/80 backdrop-blur-md px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-200 active:scale-95"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSavingNote}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium text-white transition-all duration-200 disabled:opacity-50 neon-btn-primary active:scale-95 cursor-pointer shadow-md"
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

      {/* Модалка наград и медалей («Зал Славы» - Лаунчерное стекло) */}
      {badgeModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={(e) =>
            !isSavingBadge &&
            e.target === e.currentTarget &&
            setBadgeModalItem(null)
          }
        >
          <div
            className="relative w-full max-w-md rounded-2xl border bg-[#0d111a]/95 backdrop-blur-xl p-6 shadow-2xl"
            style={{
              borderColor: 'var(--neon-badge-border)',
              boxShadow: '0 0 25px rgba(var(--neon-primary-rgb), 0.25)',
            }}
          >
            <button
              onClick={() => setBadgeModalItem(null)}
              disabled={isSavingBadge}
              className="absolute right-4 top-4 rounded-xl border border-transparent p-1.5 text-white/40 transition-all duration-200 hover:border-white/10 hover:bg-white/10 hover:text-white active:scale-95"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Crown className="text-[var(--neon-text)]" size={20} />
              <h2 className="font-fantasy text-lg font-bold text-white">
                Зал Славы — Награда
              </h2>
            </div>
            <p className="text-xs text-white/40 mb-4 truncate font-mono">
              {badgeModalItem.title}
            </p>

            {/* Выбор готовых пресетов медалек */}
            <label className="block text-xs font-medium text-[var(--neon-text)] mb-2">
              Выберите награду:
            </label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {BADGE_PRESETS.map((preset) => {
                const isSelected = selectedBadge === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      setSelectedBadge(preset.value);
                      setCustomBadgeInput('');
                    }}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all duration-200 active:scale-95 text-left ${
                      isSelected
                        ? 'neon-badge ring-1 ring-[var(--neon-border)] font-semibold shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.3)]'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Или свой текст */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Или введите свою награду:
              </label>
              <input
                type="text"
                value={customBadgeInput}
                onChange={(e) => {
                  setCustomBadgeInput(e.target.value);
                  setSelectedBadge(e.target.value);
                }}
                placeholder="Например: 🌟 Любимая игра, 🗡️ 150 часов..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none transition neon-ring-focus focus:bg-white/10"
              />
            </div>

            {/* Предпросмотр золотого бейджа */}
            {selectedBadge.trim() && (
              <div
                className="mb-5 flex flex-col items-center justify-center p-3 rounded-xl border bg-black/40"
                style={{ borderColor: 'var(--neon-badge-border)' }}
              >
                <span className="text-[11px] text-white/40 mb-1.5">
                  Предпросмотр на постере:
                </span>
                <div className="badge-gold-shimmer rounded-lg border border-yellow-200/90 px-3 py-1 shadow-[0_2px_12px_rgba(245,158,11,0.5)]">
                  <span className="font-fantasy text-xs font-black tracking-wide text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] flex items-center justify-center gap-1">
                    {selectedBadge.trim()}
                  </span>
                </div>
              </div>
            )}

            {/* Кнопки действий */}
            <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-4">
              {badgeModalItem.badge ? (
                <button
                  type="button"
                  onClick={() => handleSaveBadge(null)}
                  disabled={isSavingBadge}
                  className="text-xs text-rose-400 hover:text-rose-300 py-1.5 px-3 rounded-xl border border-transparent hover:border-rose-500/30 hover:bg-rose-500/10 transition-all duration-200 active:scale-95"
                >
                  Снять награду
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBadgeModalItem(null)}
                  disabled={isSavingBadge}
                  className="rounded-xl border border-white/15 bg-[#0d111a]/80 backdrop-blur-md px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-200 active:scale-95"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBadge(selectedBadge)}
                  disabled={isSavingBadge || !selectedBadge.trim()}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium text-white transition-all duration-200 disabled:opacity-40 neon-btn-primary active:scale-95 cursor-pointer shadow-md"
                >
                  {isSavingBadge ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  <span>Применить</span>
                </button>
              </div>
            </div>
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
