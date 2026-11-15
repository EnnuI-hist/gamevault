'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Tag,
  Flame,
  Search,
  X,
  Plus,
  Check,
  Loader2,
  Sparkles,
  Gamepad2,
  RefreshCw,
  ArrowUpRight,
  TrendingUp,
  ListTodo,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { playClick, playHover, playSuccess } from '@/lib/sounds';
import {
  fetchSteamDeals,
  searchSteamDealForGame,
  type CheapSharkDeal,
  type DealSort,
} from '@/lib/cheapshark';
import type { BacklogItem } from '@/lib/types';
import AuthModal from '@/components/AuthModal';

const PLANNED_CACHE_KEY = 'gamevault_deals_planned_cache';
const RUB_RATE_CACHE_KEY = 'gamevault_rub_rate';
const CURRENCY_STORAGE_KEY = 'gamevault_deals_currency';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const FALLBACK_RUB_RATE = 98;

type Currency = 'RUB' | 'USD';

// Функция форматирования цены в рублях или долларах
function formatPrice(usdPrice: string | number, currency: Currency, rubRate: number): string {
  const usd = typeof usdPrice === 'number' ? usdPrice : parseFloat(usdPrice);
  if (isNaN(usd)) return String(usdPrice);

  if (currency === 'USD') {
    return `$${usd.toFixed(2)}`;
  }

  // Режим ₽ RUB: умножаем на актуальный курс, округляем до целого числа и разделяем разряды пробелами
  const rub = Math.round(usd * rubRate);
  const formattedNumber = rub.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formattedNumber} ₽`;
}

// Перевод оценок Steam на русский язык
function formatSteamRating(text: string | null | undefined): string {
  if (!text) return '';
  switch (text.toLowerCase()) {
    case 'overwhelmingly positive':
      return 'Крайне положит.';
    case 'very positive':
      return 'Очень положит.';
    case 'positive':
      return 'Положительные';
    case 'mostly positive':
      return 'В основном положит.';
    case 'mixed':
      return 'Смешанные';
    case 'mostly negative':
      return 'В основном отрицат.';
    case 'very negative':
      return 'Очень отрицат.';
    case 'overwhelmingly negative':
      return 'Крайне отрицат.';
    default:
      return text;
  }
}

interface PlannedMatch {
  plannedItem: BacklogItem;
  deal: CheapSharkDeal;
}

export default function DealsPage() {
  const { user } = useAuth();
  const supabase = createClient();

  // Состояние авторизации
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Валюта и курс рубля
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [rubRate, setRubRate] = useState<number>(FALLBACK_RUB_RATE);

  // Блок 1: Скидки на вишлист
  const [plannedDeals, setPlannedDeals] = useState<PlannedMatch[]>([]);
  const [loadingPlanned, setLoadingPlanned] = useState(true);
  const [totalPlannedCount, setTotalPlannedCount] = useState(0);

  // Блок 2: Каталог акций Steam
  const [deals, setDeals] = useState<CheapSharkDeal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [errorDeals, setErrorDeals] = useState<string | null>(null);

  // Фильтры
  const [searchQuery, setSearchQuery] = useState('');
  const [minSavings, setMinSavings] = useState<number>(0); // 0, 50, 75
  const [sortBy, setSortBy] = useState<DealSort>('Deal Rating');
  const [pageNumber, setPageNumber] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Множество названий игр, уже находящихся в бэклоге (для кнопки "+ В планы")
  const [backlogTitleSet, setBacklogTitleSet] = useState<Set<string>>(new Set());
  const [addingDealId, setAddingDealId] = useState<string | null>(null);

  // 1. Загрузка курса доллара к рублю через API open.er-api.com с кэшированием на 6 часов
  const loadRubRate = useCallback(async () => {
    try {
      const cached = localStorage.getItem(RUB_RATE_CACHE_KEY);
      if (cached) {
        const { rate, timestamp } = JSON.parse(cached);
        if (typeof rate === 'number' && rate > 0 && Date.now() - timestamp < SIX_HOURS_MS) {
          setRubRate(rate);
          return;
        }
      }
    } catch {}

    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('API er-api.com returned non-200');
      const data = await res.json();
      const rub = data?.rates?.RUB;
      if (typeof rub === 'number' && rub > 0) {
        setRubRate(rub);
        try {
          localStorage.setItem(
            RUB_RATE_CACHE_KEY,
            JSON.stringify({ rate: rub, timestamp: Date.now() })
          );
        } catch {}
        return;
      }
    } catch (err) {
      console.warn('Не удалось загрузить курс рубля через er-api.com, используется запасной курс 98:', err);
    }
    setRubRate(FALLBACK_RUB_RATE);
  }, []);

  // 2. Загрузка вишлиста из Supabase и проверка скидок через CheapShark API
  const loadPlannedDiscounts = useCallback(async (forceFresh = false) => {
    setLoadingPlanned(true);
    try {
      // Проверяем кэш
      if (!forceFresh) {
        try {
          const cached = sessionStorage.getItem(PLANNED_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.deals)) {
              setPlannedDeals(parsed.deals);
              setTotalPlannedCount(parsed.totalCount ?? 0);
              setLoadingPlanned(false);
              return;
            }
          }
        } catch {}
      }

      // Получаем игры со статусом planned
      const { data: plannedGames, error } = await supabase
        .from('game_backlog')
        .select('id, title, status, note, cover_url, badge, created_at')
        .eq('status', 'planned')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка загрузки planned игр из Supabase:', error);
        setLoadingPlanned(false);
        return;
      }

      const games = (plannedGames as BacklogItem[]) || [];
      setTotalPlannedCount(games.length);

      if (games.length === 0) {
        setPlannedDeals([]);
        setLoadingPlanned(false);
        return;
      }

      // Параллельно опрашиваем CheapShark для каждой запланированной игры
      const matches: PlannedMatch[] = [];
      const promises = games.map(async (game) => {
        const deal = await searchSteamDealForGame(game.title);
        if (deal && parseFloat(deal.savings) > 0) {
          matches.push({ plannedItem: game, deal });
        }
      });

      await Promise.allSettled(promises);

      // Сортируем скидки по размеру экономии
      matches.sort((a, b) => parseFloat(b.deal.savings) - parseFloat(a.deal.savings));

      setPlannedDeals(matches);

      try {
        sessionStorage.setItem(
          PLANNED_CACHE_KEY,
          JSON.stringify({ deals: matches, totalCount: games.length, time: Date.now() })
        );
      } catch {}
    } catch (err) {
      console.error('Ошибка проверки скидок на вишлист:', err);
    } finally {
      setLoadingPlanned(false);
    }
  }, [supabase]);

  // 3. Загрузка общего каталога акций Steam
  const loadSteamDeals = useCallback(
    async (page = 0, isAppend = false) => {
      if (page === 0) setLoadingDeals(true);
      else setLoadingMore(true);
      setErrorDeals(null);

      try {
        const newDeals = await fetchSteamDeals({
          sortBy,
          pageSize: 48,
          pageNumber: page,
          title: searchQuery.trim() || undefined,
        });

        if (isAppend) {
          setDeals((prev) => {
            const existingIds = new Set(prev.map((d) => d.dealID));
            const filteredNew = newDeals.filter((d) => !existingIds.has(d.dealID));
            return [...prev, ...filteredNew];
          });
        } else {
          setDeals(newDeals);
        }

        setHasMore(newDeals.length >= 48);
        setPageNumber(page);
      } catch (err) {
        console.error('Ошибка загрузки акций Steam:', err);
        setErrorDeals('Не удалось загрузить скидки Steam. Попробуйте обновить страницу.');
      } finally {
        setLoadingDeals(false);
        setLoadingMore(false);
      }
    },
    [sortBy, searchQuery]
  );

  // 4. Загрузка всех существующих игр из бэклога для отметки «В планах»
  const loadAllBacklogTitles = useCallback(async () => {
    try {
      const { data } = await supabase.from('game_backlog').select('title');
      if (data) {
        const set = new Set(data.map((item) => item.title.toLowerCase().trim()));
        setBacklogTitleSet(set);
      }
    } catch (err) {
      console.warn('Ошибка загрузки заголовков бэклога:', err);
    }
  }, [supabase]);

  // Начальная загрузка при монтировании
  useEffect(() => {
    // Восстанавливаем сохранённую валюту (по умолчанию RUB)
    try {
      const savedCurr = localStorage.getItem(CURRENCY_STORAGE_KEY) as Currency;
      if (savedCurr === 'RUB' || savedCurr === 'USD') {
        setCurrency(savedCurr);
      }
    } catch {}

    loadRubRate();
    loadPlannedDiscounts();
    loadAllBacklogTitles();
  }, [loadRubRate, loadPlannedDiscounts, loadAllBacklogTitles]);

  // Загрузка акций при смене сортировки или запроса поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSteamDeals(0, false);
    }, searchQuery ? 400 : 0);

    return () => clearTimeout(timer);
  }, [loadSteamDeals, searchQuery, sortBy]);

  // Фильтрация акций по минимальному порогу скидки
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const savings = parseFloat(deal.savings);
      if (minSavings > 0 && savings < minSavings) return false;
      return true;
    });
  }, [deals, minSavings]);

  // Переключение валюты
  const handleCurrencyChange = (newCurr: Currency) => {
    setCurrency(newCurr);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, newCurr);
    } catch {}
    playClick();
  };

  // Добавление игры в вишлист «В планах»
  const handleAddToPlanned = async (deal: CheapSharkDeal) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setAddingDealId(deal.dealID);
    try {
      const headerUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${deal.steamAppID}/header.jpg`;
      const discount = Math.round(parseFloat(deal.savings));
      const priceText = formatPrice(deal.salePrice, currency, rubRate);

      const noteText = discount > 0
        ? `Steam скидка -${discount}% (${priceText})`
        : `Steam (${priceText})`;

      const { data, error } = await supabase
        .from('game_backlog')
        .insert({
          title: deal.title,
          status: 'planned',
          note: noteText,
          cover_url: headerUrl,
        })
        .select()
        .single();

      if (error) throw error;

      playSuccess();

      // Обновляем список названий
      setBacklogTitleSet((prev) => {
        const next = new Set(prev);
        next.add(deal.title.toLowerCase().trim());
        return next;
      });

      // Добавляем в блок вишлиста, если есть скидка
      if (data && discount > 0) {
        setPlannedDeals((prev) => [
          { plannedItem: data as BacklogItem, deal },
          ...prev,
        ]);
        setTotalPlannedCount((c) => c + 1);
      }
    } catch (err) {
      console.error('Ошибка добавления в вишлист:', err);
      alert('Не удалось добавить игру в список «В планах»');
    } finally {
      setAddingDealId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 space-y-10">
      {/* Шапка страницы скидок */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d121d]/85 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
        {/* Фоновое неоновое свечение */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: 'var(--neon-primary)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full opacity-15 blur-3xl"
          style={{ backgroundColor: 'var(--neon-secondary)' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--neon-badge-border)] bg-[var(--neon-badge-bg)] px-3 py-1 text-xs font-mono font-medium text-[var(--neon-text)] shadow-[0_0_14px_rgba(var(--neon-primary-rgb),0.3)]">
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: 'var(--neon-primary)' }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: 'var(--neon-primary)', boxShadow: '0 0 8px var(--neon-primary)' }}
                />
              </span>
              <span>CheapShark Steam API • 1 $ ≈ {Math.round(rubRate)} ₽</span>
            </div>

            <h1 className="font-fantasy text-2xl sm:text-3xl md:text-4xl font-black tracking-wide text-white">
              Скидки и распродажи Steam
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-white/60">
              Мониторинг лучших цен Steam в реальном времени с автоматической проверкой скидок на игры из вашего личного списка «В планах».
            </p>
          </div>

          {/* Быстрые действия в шапке */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                playClick();
                loadRubRate();
                loadPlannedDiscounts(true);
                loadSteamDeals(0, false);
              }}
              onMouseEnter={playHover}
              disabled={loadingPlanned || loadingDeals}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs sm:text-sm font-medium text-white/80 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/30 hover:text-white active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
              title="Обновить акции и курс валют прямо сейчас"
            >
              <RefreshCw size={14} className={loadingPlanned || loadingDeals ? 'animate-spin text-[var(--neon-primary)]' : ''} />
              <span>Обновить цены</span>
            </button>

            <Link
              href="/list"
              prefetch={false}
              onClick={playClick}
              onMouseEnter={playHover}
              className="flex items-center gap-2 rounded-xl border border-[var(--neon-border)] bg-[var(--neon-badge-bg)] px-4 py-2 text-xs sm:text-sm font-medium text-[var(--neon-text)] backdrop-blur-md transition-all hover:shadow-[0_0_16px_rgba(var(--neon-primary-rgb),0.35)] active:scale-95 shadow-sm"
            >
              <ListTodo size={14} />
              <span>Мой список</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* БЛОК 1: СКИДКИ НА МОЙ СПИСОК «В ПЛАНАХ»                 */}
      {/* ======================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl border bg-[#0d121d]/90 shadow-sm"
              style={{
                borderColor: 'var(--neon-border)',
                boxShadow: '0 0 12px rgba(var(--neon-primary-rgb), 0.3)',
              }}
            >
              <Flame size={18} className="text-[var(--neon-primary)]" />
            </div>
            <div>
              <h2 className="font-fantasy text-lg sm:text-xl font-bold tracking-wide text-white flex items-center gap-2">
                <span>Скидки на мой список «В планах»</span>
                {plannedDeals.length > 0 && (
                  <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-xs font-mono font-bold text-rose-400">
                    +{plannedDeals.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-white/50">
                Игры из вашего вишлиста, на которые прямо сейчас действует скидка в Steam
              </p>
            </div>
          </div>
        </div>

        {/* Содержимое блока 1 */}
        {loadingPlanned ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#0d121d]/80 p-8 backdrop-blur-md">
            <Loader2 size={20} className="animate-spin text-[var(--neon-primary)]" />
            <span className="text-sm font-mono text-white/70">
              Сверяем цены в Steam для игр из вашего списка «В планах»...
            </span>
          </div>
        ) : plannedDeals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plannedDeals.map(({ plannedItem, deal }) => {
              const discount = Math.round(parseFloat(deal.savings));
              const headerImg = `https://cdn.akamai.steamstatic.com/steam/apps/${deal.steamAppID}/header.jpg`;
              const metacritic = parseInt(deal.metacriticScore, 10);
              const savingsAmount = parseFloat(deal.normalPrice) - parseFloat(deal.salePrice);

              return (
                <div
                  key={deal.dealID}
                  className="group relative overflow-hidden rounded-2xl border bg-[#0d111a]/90 backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] flex flex-col"
                  style={{
                    borderColor: 'var(--neon-border)',
                    boxShadow: '0 0 24px rgba(var(--neon-primary-rgb), 0.25)',
                  }}
                >
                  {/* Постер игры */}
                  <div className="relative aspect-[460/215] w-full overflow-hidden bg-black/60">
                    <img
                      src={headerImg}
                      alt={deal.title}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = deal.thumb;
                      }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Бейдж размера скидки (только если > 0) */}
                    {discount > 0 && (
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1 font-mono text-sm font-black text-white shadow-lg ring-1 ring-white/20">
                        <span>-{discount}%</span>
                      </div>
                    )}

                    {/* Метка "Из вишлиста" */}
                    <div className="absolute top-2.5 left-2.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 px-2 py-0.5 text-[10px] font-mono text-white/90">
                      В планах
                    </div>
                  </div>

                  {/* Информация об игре */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3
                        className="font-fantasy text-base font-bold text-white transition-colors group-hover:text-[var(--neon-text)] line-clamp-1"
                        title={deal.title}
                      >
                        {deal.title}
                      </h3>

                      {/* Рейтинги: Metacritic и Steam */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        {deal.steamRatingText && (
                          <span
                            className="font-mono text-[11px] text-emerald-400 font-medium"
                            title={`Рейтинг Steam: ${deal.steamRatingPercent}% (${deal.steamRatingCount} отзывов)`}
                          >
                            ★ {deal.steamRatingPercent}% {formatSteamRating(deal.steamRatingText)}
                          </span>
                        )}
                        {metacritic > 0 && (
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-mono font-bold border"
                            style={{
                              backgroundColor: metacritic >= 75 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                              borderColor: metacritic >= 75 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(234, 179, 8, 0.4)',
                              color: metacritic >= 75 ? '#34d399' : '#facc15',
                            }}
                            title={`Metacritic Score: ${metacritic}`}
                          >
                            MC {metacritic}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Цены */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        {discount > 0 && (
                          <span className="text-xs font-mono text-white/40 line-through">
                            {formatPrice(deal.normalPrice, currency, rubRate)}
                          </span>
                        )}
                        <span
                          className="font-mono text-lg font-black text-white"
                          style={{
                            color: 'var(--neon-primary)',
                            textShadow: '0 0 12px rgba(var(--neon-primary-rgb), 0.8)',
                          }}
                        >
                          {formatPrice(deal.salePrice, currency, rubRate)}
                        </span>
                      </div>

                      {discount > 0 && savingsAmount > 0 && (
                        <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                          Экономия {formatPrice(savingsAmount, currency, rubRate)}
                        </span>
                      )}
                    </div>

                    {/* Кнопки открытия */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <a
                        href={`steam://store/${deal.steamAppID}`}
                        onClick={playClick}
                        onMouseEnter={playHover}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--neon-border)] bg-[var(--neon-badge-bg)] px-3 py-1.5 text-xs font-medium text-[var(--neon-text)] transition-all hover:shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.35)] active:scale-95"
                        title="Открыть страницу игры в установленном клиенте Steam"
                      >
                        <Gamepad2 size={13} />
                        <span>В клиенте</span>
                      </a>

                      <a
                        href={`https://store.steampowered.com/app/${deal.steamAppID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={playClick}
                        onMouseEnter={playHover}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white hover:border-white/20 active:scale-95"
                        title="Открыть в браузере"
                      >
                        <span>В браузере</span>
                        <ArrowUpRight size={13} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0d121d]/80 p-5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/40">
                <Tag size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">
                  {totalPlannedCount === 0
                    ? 'Ваш список «В планах» пока пуст'
                    : 'Сейчас на игры из вашего вишлиста нет активных скидок в Steam'}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  {totalPlannedCount === 0
                    ? 'Добавляйте интересующие вас игры из каталога акций ниже кнопкой «+ В планы»!'
                    : `Всего в вишлисте отслеживается ${totalPlannedCount} ${totalPlannedCount === 1 ? 'игра' : 'игр'}. Как только появится скидка, она появится здесь.`}
                </p>
              </div>
            </div>

            <Link
              href="/list"
              prefetch={false}
              onClick={playClick}
              onMouseEnter={playHover}
              className="shrink-0 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
            >
              <span>Открыть вишлист</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
      </section>

      {/* ======================================================== */}
      {/* БЛОК 2: АКТУАЛЬНЫЕ АКЦИИ И РАСПРОДАЖИ STEAM              */}
      {/* ======================================================== */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl border bg-[#0d121d]/90 shadow-sm"
              style={{
                borderColor: 'var(--neon-border)',
                boxShadow: '0 0 12px rgba(var(--neon-primary-rgb), 0.3)',
              }}
            >
              <TrendingUp size={18} className="text-[var(--neon-primary)]" />
            </div>
            <div>
              <h2 className="font-fantasy text-lg sm:text-xl font-bold tracking-wide text-white">
                Актуальные акции и распродажи Steam
              </h2>
              <p className="text-xs text-white/50">
                Лучшие предложения, горячие новинки и самые большие скидки в каталоге Steam
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-white/40">
            Отображено: <span className="text-[var(--neon-text)] font-bold">{filteredDeals.length}</span> акций
          </div>
        </div>

        {/* Панель фильтров, поиска и переключателя валюты */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 rounded-2xl border border-white/10 bg-[#0d111a]/85 p-3 sm:p-4 backdrop-blur-xl shadow-sm">
          {/* Поиск по названию */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию игры в Steam..."
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2 pl-10 pr-9 text-xs sm:text-sm text-white placeholder-white/30 outline-none transition focus:border-[var(--neon-border)] focus:ring-1 focus:ring-[var(--neon-primary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Панель правых переключателей */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Стеклянно-неоновый переключатель валюты ₽ RUB / $ USD */}
            <div
              className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1 shrink-0"
              title={`Курс валют: 1 USD ≈ ${rubRate.toFixed(1)} RUB (обновляется через er-api.com)`}
            >
              {(['RUB', 'USD'] as const).map((curr) => {
                const isActive = currency === curr;
                return (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => handleCurrencyChange(curr)}
                    onMouseEnter={playHover}
                    className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'border border-[var(--neon-badge-border)] bg-[var(--neon-badge-bg)] text-[var(--neon-text)] shadow-[0_0_10px_rgba(var(--neon-primary-rgb),0.3)]'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {curr === 'RUB' ? '₽ RUB' : '$ USD'}
                  </button>
                );
              })}
            </div>

            {/* Переключатель минимальной скидки */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1 shrink-0">
              {[
                { label: 'Все', value: 0 },
                { label: 'От 50%', value: 50 },
                { label: 'От 75%', value: 75 },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setMinSavings(tab.value);
                    playClick();
                  }}
                  onMouseEnter={playHover}
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all ${
                    minSavings === tab.value
                      ? 'border border-[var(--neon-badge-border)] bg-[var(--neon-badge-bg)] text-[var(--neon-text)] shadow-[0_0_10px_rgba(var(--neon-primary-rgb),0.3)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Переключатель сортировки */}
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1 shrink-0">
              {[
                { label: 'По рейтингу', value: 'Deal Rating' as DealSort },
                { label: 'По скидке', value: 'Savings' as DealSort },
                { label: 'По цене', value: 'Price' as DealSort },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setSortBy(tab.value);
                    playClick();
                  }}
                  onMouseEnter={playHover}
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-all ${
                    sortBy === tab.value
                      ? 'border border-[var(--neon-badge-border)] bg-[var(--neon-badge-bg)] text-[var(--neon-text)] shadow-[0_0_10px_rgba(var(--neon-primary-rgb),0.3)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Сетка карточек акций */}
        {loadingDeals && deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Loader2 size={32} className="animate-spin text-[var(--neon-primary)]" />
            <span className="font-mono text-sm text-white/60">Загрузка актуальных скидок Steam...</span>
          </div>
        ) : errorDeals ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center space-y-3">
            <p className="text-sm text-rose-300 font-medium">{errorDeals}</p>
            <button
              type="button"
              onClick={() => loadSteamDeals(0, false)}
              className="rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
            >
              Попробовать снова
            </button>
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0d121d]/60 p-12 text-center space-y-2">
            <p className="text-base text-white/80 font-medium">Ничего не найдено</p>
            <p className="text-xs text-white/40">
              Попробуйте изменить поисковый запрос или порог минимальной скидки
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {filteredDeals.map((deal) => {
                const discount = Math.round(parseFloat(deal.savings));
                const headerImg = `https://cdn.akamai.steamstatic.com/steam/apps/${deal.steamAppID}/header.jpg`;
                const metacritic = parseInt(deal.metacriticScore, 10);
                const isAlreadyPlanned = backlogTitleSet.has(deal.title.toLowerCase().trim());
                const isAdding = addingDealId === deal.dealID;

                return (
                  <div
                    key={deal.dealID}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d111a]/85 backdrop-blur-xl transition-all duration-300 hover:border-[var(--neon-border)] hover:shadow-[0_0_22px_rgba(var(--neon-primary-rgb),0.3)] hover:-translate-y-0.5"
                  >
                    {/* Обложка / постер */}
                    <div className="relative aspect-[460/215] w-full overflow-hidden bg-black/60">
                      <img
                        src={headerImg}
                        alt={deal.title}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = deal.thumb;
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Скидка в правом верхнем углу (ТОЛЬКО если скидка > 0%) */}
                      {discount > 0 && (
                        <div className="absolute top-2 right-2 rounded-lg bg-rose-600 px-2 py-0.5 font-mono text-xs font-black text-white shadow-md">
                          -{discount}%
                        </div>
                      )}

                      {/* Оценка Metacritic на постере */}
                      {metacritic > 0 && (
                        <div
                          className="absolute bottom-2 left-2 rounded px-1.5 py-0.5 text-[10px] font-mono font-black border backdrop-blur-md"
                          style={{
                            backgroundColor: metacritic >= 75 ? 'rgba(16, 185, 129, 0.85)' : 'rgba(234, 179, 8, 0.85)',
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            color: '#ffffff',
                          }}
                        >
                          MC {metacritic}
                        </div>
                      )}
                    </div>

                    {/* Тело карточки */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3
                          className="font-fantasy text-sm font-bold text-white transition-colors group-hover:text-[var(--neon-text)] line-clamp-1"
                          title={deal.title}
                        >
                          {deal.title}
                        </h3>

                        {/* Отзывы Steam */}
                        <div className="mt-1 flex items-center gap-1.5 text-xs">
                          {deal.steamRatingText ? (
                            <span className="font-mono text-[11px] text-emerald-400 font-medium truncate">
                              ★ {deal.steamRatingPercent}% {formatSteamRating(deal.steamRatingText)}
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] text-white/30">Мало отзывов</span>
                          )}
                        </div>
                      </div>

                      {/* Цены: если discount <= 0%, зачёркнутая старая цена скрывается */}
                      <div className="pt-2 border-t border-white/5 flex items-baseline justify-between">
                        <div className="flex items-baseline gap-2">
                          {discount > 0 && (
                            <span className="text-xs font-mono text-white/40 line-through">
                              {formatPrice(deal.normalPrice, currency, rubRate)}
                            </span>
                          )}
                          <span
                            className="font-mono text-base font-black text-white"
                            style={{
                              color: 'var(--neon-primary)',
                              textShadow: '0 0 10px rgba(var(--neon-primary-rgb), 0.7)',
                            }}
                          >
                            {formatPrice(deal.salePrice, currency, rubRate)}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-white/40">
                          {deal.dealRating ? `Рейтинг: ${deal.dealRating}` : ''}
                        </span>
                      </div>

                      {/* Кнопки действий */}
                      <div className="space-y-1.5 pt-1">
                        <div className="grid grid-cols-2 gap-1.5">
                          <a
                            href={`steam://store/${deal.steamAppID}`}
                            onClick={playClick}
                            onMouseEnter={playHover}
                            className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-1.5 text-[11px] font-medium text-white/80 transition-all hover:bg-white/10 hover:border-white/20 hover:text-white active:scale-95 text-center"
                            title="Открыть страницу игры в клиенте Steam"
                          >
                            <Gamepad2 size={12} />
                            <span>Клиент</span>
                          </a>

                          <a
                            href={`https://store.steampowered.com/app/${deal.steamAppID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={playClick}
                            onMouseEnter={playHover}
                            className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-1.5 text-[11px] font-medium text-white/80 transition-all hover:bg-white/10 hover:border-white/20 hover:text-white active:scale-95 text-center"
                            title="Открыть в браузере"
                          >
                            <span>Магазин</span>
                            <ArrowUpRight size={12} />
                          </a>
                        </div>

                        {/* Кнопка добавления в вишлист «В планах» */}
                        <button
                          type="button"
                          onClick={() => handleAddToPlanned(deal)}
                          onMouseEnter={playHover}
                          disabled={isAlreadyPlanned || isAdding}
                          className={`w-full flex items-center justify-center gap-1.5 rounded-xl border py-1.5 text-xs font-medium transition-all cursor-pointer ${
                            isAlreadyPlanned
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 opacity-80 cursor-default'
                              : 'border-[var(--neon-border)] bg-[var(--neon-badge-bg)] text-[var(--neon-text)] hover:shadow-[0_0_14px_rgba(var(--neon-primary-rgb),0.35)] active:scale-95'
                          }`}
                          title={isAlreadyPlanned ? 'Игра уже в вашем списке бэклога' : 'Добавить игру в список «В планах»'}
                        >
                          {isAdding ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Добавляем...</span>
                            </>
                          ) : isAlreadyPlanned ? (
                            <>
                              <Check size={13} />
                              <span>В планах</span>
                            </>
                          ) : (
                            <>
                              <Plus size={13} />
                              <span>+ В планы</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Кнопка "Загрузить ещё" */}
            {hasMore && !searchQuery && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    loadSteamDeals(pageNumber + 1, true);
                  }}
                  onMouseEnter={playHover}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded-2xl border border-white/15 bg-[#0d121d]/90 px-6 py-3 text-sm font-medium text-white/80 backdrop-blur-xl transition-all hover:border-[var(--neon-border)] hover:bg-white/10 hover:text-white active:scale-95 shadow-lg cursor-pointer"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-[var(--neon-primary)]" />
                      <span>Загружаем ещё акции...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="text-[var(--neon-text)]" />
                      <span>Загрузить ещё 48 скидок</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Модальное окно входа при попытке добавить в вишлист без авторизации */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
