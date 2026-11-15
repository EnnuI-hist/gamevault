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
        className="hidden md:flex items-center gap-3.5 rounded-2xl border px-4 py-2 bg-[#0d111a]/90 backdrop-blur-xl shadow-sm"
        style={{
          borderColor: 'var(--neon-border)',
          boxShadow: '0 0 20px rgba(var(--neon-primary-rgb), 0.25)',
        }}
        aria-hidden="true"
      >
        <div className="flex items-baseline font-mono select-none opacity-40">
          <span className="text-xl sm:text-2xl font-bold tracking-wider text-white">--:--</span>
          <span className="text-base sm:text-lg font-semibold text-[var(--neon-primary)] ml-1">:--</span>
        </div>
        <div className="h-7 w-[1px] bg-white/10" />
        <div className="flex flex-col justify-center gap-0.5 opacity-40 font-mono">
          <span className="text-[11px] text-white/50 leading-tight">-- ---, --</span>
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="h-2 w-2 rounded-full bg-white/20" />
            <span className="text-[10px] font-bold tracking-widest text-white/40">ONLINE</span>
          </div>
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
      className="hidden md:flex items-center gap-3.5 rounded-2xl border px-4 py-2 bg-[#0d111a]/90 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]"
      style={{
        borderColor: 'var(--neon-border)',
        boxShadow: '0 0 20px rgba(var(--neon-primary-rgb), 0.35), inset 0 0 12px rgba(var(--neon-primary-rgb), 0.08)',
      }}
      title="Локальное кибер-время и статус системы"
    >
      {/* Крупные цифры времени: ЧЧ:ММ + бегущие секунды :СС */}
      <div className="flex items-baseline font-mono select-none">
        <span
          className="text-xl sm:text-2xl font-bold tracking-wider text-white"
          style={{
            textShadow: '0 0 14px rgba(var(--neon-primary-rgb), 0.8), 0 0 25px rgba(var(--neon-primary-rgb), 0.4)',
          }}
        >
          {hours}:{minutes}
        </span>
        <span
          className="text-base sm:text-lg font-semibold tracking-wider text-[var(--neon-primary)] ml-1"
          style={{
            textShadow: '0 0 10px rgba(var(--neon-primary-rgb), 0.9), 0 0 18px rgba(var(--neon-primary-rgb), 0.5)',
          }}
        >
          :{seconds}
        </span>
      </div>

      {/* Тонкий вертикальный неоновый разделитель */}
      <div
        className="h-7 w-[1px] opacity-35"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, var(--neon-primary) 50%, transparent 100%)',
        }}
      />

      {/* Две строчки: Сверху дата, снизу пульсирующая точка и ONLINE */}
      <div className="flex flex-col justify-center gap-0.5 select-none font-mono">
        {/* Сверху: Дата (15 ноя, вс) */}
        <span className="text-[11px] font-medium tracking-wide text-white/80 whitespace-nowrap leading-tight">
          {dateStr}
        </span>

        {/* Снизу: Пульсирующая неоновая точка и статус ONLINE */}
        <div className="flex items-center gap-1.5 leading-tight" title="Система: Онлайн">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-80"
              style={{ backgroundColor: 'var(--neon-primary)' }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{
                backgroundColor: 'var(--neon-primary)',
                boxShadow: '0 0 10px var(--neon-primary)',
              }}
            />
          </span>
          <span
            className="text-[10px] font-bold tracking-widest text-[var(--neon-text)] uppercase"
            style={{ textShadow: '0 0 8px rgba(var(--neon-primary-rgb), 0.85)' }}
          >
            ONLINE
          </span>
        </div>
      </div>
    </div>
  );
}
