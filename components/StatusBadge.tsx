'use client';

import { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Gamepad2, Clock, XCircle, ChevronDown } from 'lucide-react';
import type { GameStatus } from '@/lib/types';

export interface StatusConfig {
  value: GameStatus;
  label: string;
  badgeClass: string;
  textClass: string;
  dotClass: string;
  borderClass: string;
  icon: typeof CheckCircle2;
}

export const STATUS_MAP: Record<GameStatus, StatusConfig> = {
  completed: {
    value: 'completed',
    label: 'Пройдено',
    badgeClass: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/90',
    textClass: 'text-emerald-300',
    dotClass: 'bg-emerald-400',
    borderClass: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
  playing: {
    value: 'playing',
    label: 'Прохожу',
    badgeClass: 'bg-amber-950/80 border-amber-500/40 text-amber-300 hover:bg-amber-900/90',
    textClass: 'text-amber-300',
    dotClass: 'bg-amber-400',
    borderClass: 'border-amber-500/30',
    icon: Gamepad2,
  },
  planned: {
    value: 'planned',
    label: 'В планах',
    badgeClass: 'bg-sky-950/80 border-sky-500/40 text-sky-300 hover:bg-sky-900/90',
    textClass: 'text-sky-300',
    dotClass: 'bg-sky-400',
    borderClass: 'border-sky-500/30',
    icon: Clock,
  },
  dropped: {
    value: 'dropped',
    label: 'Дропнуто',
    badgeClass: 'bg-rose-950/80 border-rose-500/40 text-rose-300 hover:bg-rose-900/90',
    textClass: 'text-rose-300',
    dotClass: 'bg-rose-400',
    borderClass: 'border-rose-500/30',
    icon: XCircle,
  },
};

export const STATUS_LIST: StatusConfig[] = [
  STATUS_MAP.completed,
  STATUS_MAP.playing,
  STATUS_MAP.planned,
  STATUS_MAP.dropped,
];

interface StatusBadgeProps {
  status?: GameStatus;
  isOwner?: boolean;
  onStatusChange?: (newStatus: GameStatus) => void;
  size?: 'sm' | 'md';
}

export default function StatusBadge({
  status = 'completed',
  isOwner = false,
  onStatusChange,
  size = 'sm',
}: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const safeStatus = STATUS_MAP[status] ? status : 'completed';
  const currentConfig = STATUS_MAP[safeStatus];
  const Icon = currentConfig.icon;
  const isInteractive = isOwner && !!onStatusChange;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (e: React.MouseEvent, newStatus: GameStatus) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
    if (newStatus !== safeStatus && onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    if (!isInteractive) return;
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const isSmall = size === 'sm';

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        disabled={!isInteractive}
        onClick={handleToggle}
        title={isInteractive ? 'Нажмите для быстрой смены статуса' : currentConfig.label}
        className={`group inline-flex items-center gap-1.5 rounded-lg border backdrop-blur-md font-medium shadow-md transition-all duration-200 ${
          currentConfig.badgeClass
        } ${
          isSmall ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
        } ${
          isInteractive
            ? 'cursor-pointer hover:scale-105 active:scale-95'
            : 'cursor-default pointer-events-none'
        }`}
      >
        <Icon size={isSmall ? 13 : 15} className="shrink-0" />
        <span>{currentConfig.label}</span>
        {isInteractive && (
          <ChevronDown
            size={isSmall ? 11 : 13}
            className={`transition-transform duration-200 opacity-60 group-hover:opacity-100 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Выпадающее меню смены статуса в один клик */}
      {isOpen && isInteractive && (
        <div
          className="absolute left-0 top-full mt-1.5 z-40 w-36 overflow-hidden rounded-xl border border-white/10 bg-[#161b26]/95 backdrop-blur-xl p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Сменить статус:
          </div>
          {STATUS_LIST.map((item) => {
            const ItemIcon = item.icon;
            const isCurrent = item.value === safeStatus;
            return (
              <button
                key={item.value}
                type="button"
                onClick={(e) => handleSelect(e, item.value)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isCurrent
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <ItemIcon size={14} className={item.textClass} />
                <span className="flex-1 text-left">{item.label}</span>
                {isCurrent && (
                  <span className={`h-1.5 w-1.5 rounded-full ${item.dotClass}`} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
