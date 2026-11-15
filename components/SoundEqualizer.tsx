'use client';

import { toggleSound, playClick } from '@/lib/sounds';

interface SoundEqualizerProps {
  soundEnabled: boolean;
}

export default function SoundEqualizer({ soundEnabled }: SoundEqualizerProps) {
  return (
    <button
      type="button"
      onClick={() => {
        const next = toggleSound();
        if (next) playClick();
      }}
      className={`flex items-center justify-center h-8 px-2 rounded-xl border backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95 ${
        soundEnabled
          ? 'border-[var(--neon-border)] bg-[var(--neon-badge-bg)] shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.25)]'
          : 'border-white/10 bg-[#0d121d]/80 hover:bg-white/10 hover:border-white/20'
      }`}
      title={soundEnabled ? 'HUD Эквалайзер: Звук включен' : 'HUD Эквалайзер: Звук выключен (линия замерла)'}
      aria-label={soundEnabled ? 'Выключить звук' : 'Включить звук'}
    >
      <div className="flex items-center gap-[3px] h-3.5 w-4 justify-center" aria-hidden="true">
        <span className={`hud-eq-bar hud-eq-bar-1 ${!soundEnabled ? 'hud-eq-bar-muted' : ''}`} />
        <span className={`hud-eq-bar hud-eq-bar-2 ${!soundEnabled ? 'hud-eq-bar-muted' : ''}`} />
        <span className={`hud-eq-bar hud-eq-bar-3 ${!soundEnabled ? 'hud-eq-bar-muted' : ''}`} />
        <span className={`hud-eq-bar hud-eq-bar-4 ${!soundEnabled ? 'hud-eq-bar-muted' : ''}`} />
      </div>
    </button>
  );
}
