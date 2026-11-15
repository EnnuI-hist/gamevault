'use client';

import { useState, useEffect } from 'react';

const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const DAYS_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export default function CyberClock() {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setTime(new Date());

    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!mounted || !time) {
    return (
      <div
        className="hidden md:flex items-center gap-2 sm:gap-2.5 rounded-xl border border-white/10 bg-[#0d111a]/80 px-2.5 py-1 sm:px-3 sm:py-1.5 backdrop-blur-md shadow-sm"
        aria-hidden="true"
      >
        <div className="flex items-baseline font-mono select-none opacity-40">
          <span className="text-xs sm:text-sm font-bold tracking-wider text-white">--:--</span>
          <span className="text-[10px] sm:text-xs font-semibold text-[var(--neon-primary)] ml-0.5">:--</span>
        </div>
        <span className="h-3.5 w-[1px] bg-white/10" />
        <span className="text-[10px] sm:text-xs font-mono text-white/40">-- ---, --</span>
        <span className="h-3.5 w-[1px] bg-white/10" />
        <div className="flex items-center gap-1.5 opacity-40">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-widest text-white/40">ONLINE</span>
        </div>
      </div>
    );
  }

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');
  const dateStr = `${time.getDate()} ${MONTHS_RU[time.getMonth()]}, ${DAYS_RU[time.getDay()]}`;

  return (
    <div
      className="hidden md:flex items-center gap-2 sm:gap-2.5 rounded-xl border border-white/10 bg-[#0d111a]/80 px-2.5 py-1 sm:px-3 sm:py-1.5 backdrop-blur-md shadow-sm transition-colors duration-200 hover:border-[var(--neon-border)]"
      title="Локальное кибер-время и статус системы"
    >
      {/* Точное время с бегущими секундами */}
      <div className="flex items-baseline font-mono select-none">
        <span
          className="text-xs sm:text-sm font-bold tracking-wider text-white"
          style={{ textShadow: '0 0 10px rgba(var(--neon-primary-rgb), 0.7)' }}
        >
          {hours}:{minutes}
        </span>
        <span
          className="text-[10px] sm:text-xs font-semibold tracking-wider text-[var(--neon-primary)] ml-0.5"
          style={{ textShadow: '0 0 8px rgba(var(--neon-primary-rgb), 0.9)' }}
        >
          :{seconds}
        </span>
      </div>

      {/* Тонкий неоновый разделитель */}
      <span className="h-3.5 w-[1px] bg-white/15" />

      {/* Текущая дата (15 ноя, вс) */}
      <span className="text-[10px] sm:text-xs font-mono text-white/70 whitespace-nowrap">
        {dateStr}
      </span>

      {/* Тонкий неоновый разделитель */}
      <span className="h-3.5 w-[1px] bg-white/15" />

      {/* Пульсирующий неоновый индикатор ONLINE */}
      <div className="flex items-center gap-1.5 select-none" title="Система: Онлайн">
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: 'var(--neon-primary)' }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{
              backgroundColor: 'var(--neon-primary)',
              boxShadow: '0 0 8px var(--neon-primary)',
            }}
          />
        </span>
        <span
          className="text-[9px] sm:text-[10px] font-mono font-bold tracking-widest text-[var(--neon-text)] uppercase"
          style={{ textShadow: '0 0 6px rgba(var(--neon-primary-rgb), 0.8)' }}
        >
          ONLINE
        </span>
      </div>
    </div>
  );
}
