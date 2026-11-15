'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LogIn,
  LogOut,
  User,
  Gamepad2,
  LayoutGrid,
  ListTodo,
  Palette,
  Layers,
  Check,
  Grid3X3,
  Sparkles,
  Hexagon,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTheme, THEMES } from '@/lib/context/ThemeContext';
import { useBackground, BACKGROUNDS } from '@/lib/context/BackgroundContext';
import AuthModal from './AuthModal';

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { background, setBackground, currentBackground } = useBackground();
  const [showAuth, setShowAuth] = useState(false);
  const [showBgMenu, setShowBgMenu] = useState(false);
  const bgMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bgMenuRef.current && !bgMenuRef.current.contains(event.target as Node)) {
        setShowBgMenu(false);
      }
    };
    if (showBgMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBgMenu]);

  const isShowcase = pathname === '/' || pathname.startsWith('/game');
  const isList = pathname === '/list';

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#080a0f]/80 backdrop-blur-xl transition-colors duration-200">
        {/* Тонкая неоновая светящаяся нижняя линия */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] neon-header-line pointer-events-none" />

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2.5 px-4 py-3 sm:px-6">
          {/* Логотип: Game archive EnnuI */}
          <Link href="/" prefetch={false} className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            {/* Тёмная стеклянная иконка с тонкой неоновой обводкой и мягким свечением */}
            <div
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border bg-[#0c1017]/80 backdrop-blur-md transition-all duration-300 group-hover:scale-105"
              style={{
                borderColor: 'var(--neon-border)',
                boxShadow: '0 0 15px rgba(var(--neon-primary-rgb), 0.3)',
              }}
            >
              <Gamepad2
                size={19}
                className="transition-transform duration-300 group-hover:scale-110"
                style={{
                  color: 'var(--neon-primary)',
                  filter: 'drop-shadow(0 0 8px rgba(var(--neon-primary-rgb), 0.8))',
                }}
              />
            </div>

            {/* Текстовая часть логотипа */}
            <div className="flex items-center gap-2">
              <span className="font-sans text-sm sm:text-base font-medium tracking-wide text-white/90 group-hover:text-white transition-colors">
                Game archive
              </span>
              <span
                className="relative inline-flex items-center px-2 py-0.5 rounded-lg border backdrop-blur-sm transition-all duration-300 group-hover:scale-105"
                style={{
                  borderColor: 'var(--neon-badge-border)',
                  background: 'var(--neon-badge-bg)',
                  boxShadow: '0 0 12px rgba(var(--neon-primary-rgb), 0.35)',
                }}
              >
                <span
                  className="font-orbitron text-xs sm:text-sm font-black tracking-widest text-transparent bg-clip-text"
                  style={{
                    backgroundImage: 'var(--neon-gradient)',
                    filter: 'drop-shadow(0 0 8px rgba(var(--neon-primary-rgb), 0.75))',
                  }}
                >
                  EnnuI
                </span>
              </span>
            </div>
          </Link>

          {/* Навигационные табы: Витрина vs Список игр */}
          <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0d121d]/80 p-1 backdrop-blur-md">
            <Link
              href="/"
              prefetch={false}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                isShowcase
                  ? 'neon-badge'
                  : 'border border-transparent text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <LayoutGrid size={15} />
              <span>Витрина</span>
            </Link>

            <Link
              href="/list"
              prefetch={false}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                isList
                  ? 'neon-badge'
                  : 'border border-transparent text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ListTodo size={15} />
              <span>Список игр</span>
            </Link>
          </nav>

          {/* Правая часть: Переключатель тем и Авторизация */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Переключатель 4 неоновых тем */}
            <div
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0d121d]/80 px-2.5 py-1.5 backdrop-blur-md shadow-sm"
              title="Переключить тему оформления"
            >
              <Palette size={13} className="text-white/40 hidden xs:inline" />
              {THEMES.map((t) => {
                const isActive = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    title={t.name}
                    aria-label={t.name}
                    className={`relative h-4.5 w-4.5 sm:h-5 sm:w-5 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'scale-115 ring-2 ring-white shadow-lg'
                        : 'opacity-40 hover:opacity-100 hover:scale-110'
                    }`}
                    style={{
                      backgroundColor: t.color,
                      boxShadow: isActive ? `0 0 10px ${t.color}` : undefined,
                    }}
                  >
                    {isActive && (
                      <span className="absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Компактный переключатель живых фонов */}
            <div className="relative" ref={bgMenuRef}>
              <button
                type="button"
                onClick={() => setShowBgMenu((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium backdrop-blur-md transition-all duration-200 ${
                  showBgMenu
                    ? 'border-[var(--neon-border)] bg-[var(--neon-badge-bg)] text-[var(--neon-text)] shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.3)]'
                    : 'border-white/10 bg-[#0d121d]/80 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20'
                }`}
                title={`Живой фон: ${currentBackground.name}`}
                aria-label="Сменить живой фон"
                aria-expanded={showBgMenu}
              >
                <Layers
                  size={14}
                  className="text-[var(--neon-text)] shrink-0 transition-transform duration-200"
                />
                <span className="hidden sm:inline font-sans">{currentBackground.label}</span>
              </button>

              {/* Выпадающее меню выбора фона */}
              {showBgMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 bg-[#0c1017]/95 p-2 shadow-2xl backdrop-blur-2xl z-50 animate-fade-in">
                  <div className="px-2.5 py-1.5 border-b border-white/5 mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                      Живой фон
                    </span>
                    <span className="text-[10px] font-mono text-[var(--neon-text)]">
                      4 режима
                    </span>
                  </div>

                  <div className="space-y-1">
                    {BACKGROUNDS.map((bg) => {
                      const isActive = background === bg.id;
                      return (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => {
                            setBackground(bg.id);
                            setShowBgMenu(false);
                          }}
                          className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all ${
                            isActive
                              ? 'bg-white/10 text-white border border-[var(--neon-border)] shadow-[0_0_12px_rgba(var(--neon-primary-rgb),0.2)]'
                              : 'text-white/70 hover:bg-white/5 hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0 text-[var(--neon-text)]">
                            {bg.id === 'cyber-grid' && <Grid3X3 size={15} />}
                            {bg.id === 'nebula-abyss' && <Sparkles size={15} />}
                            {bg.id === 'dark-hex' && <Hexagon size={15} />}
                            {bg.id === 'pure-obsidian' && <Shield size={15} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-fantasy text-xs font-semibold tracking-wide">
                                {bg.name}
                              </span>
                              {isActive && (
                                <Check
                                  size={14}
                                  className="text-[var(--neon-text)] shrink-0 drop-shadow-[0_0_6px_rgba(var(--neon-primary-rgb),0.8)]"
                                />
                              )}
                            </div>
                            <p className="text-[10px] text-white/40 leading-tight mt-0.5">
                              {bg.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Авторизация */}
            {!loading && (
              user ? (
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="hidden md:flex items-center gap-2 text-sm text-white/50 font-mono">
                    <User size={14} className="text-[var(--neon-text)]" />
                    <span className="max-w-[140px] truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs sm:text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <LogOut size={14} />
                    <span className="hidden sm:inline">Выйти</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium neon-btn-primary"
                >
                  <LogIn size={14} />
                  <span>Войти</span>
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
