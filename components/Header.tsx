'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, User, Gamepad2, LayoutGrid, ListTodo } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import AuthModal from './AuthModal';

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const pathname = usePathname();

  const isShowcase = pathname === '/' || pathname.startsWith('/game');
  const isList = pathname === '/list';

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#080a0f]/75 backdrop-blur-xl transition-colors duration-200">
        {/* Тонкая неоновая светящаяся нижняя линия */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent pointer-events-none shadow-[0_1px_8px_rgba(6,182,212,0.4)]" />

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Логотип: Game archive EnnuI */}
          <Link href="/" prefetch={false} className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            {/* Тёмная стеклянная иконка с тонкой неоновой обводкой и мягким свечением */}
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/40 bg-[#0c1017]/80 shadow-[0_0_15px_rgba(6,182,212,0.3)] backdrop-blur-md transition-all duration-300 group-hover:border-cyan-300 group-hover:shadow-[0_0_22px_rgba(6,182,212,0.6)]">
              <Gamepad2
                size={19}
                className="text-cyan-400 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              />
            </div>

            {/* Текстовая часть логотипа */}
            <div className="flex items-center gap-2">
              <span className="font-sans text-sm sm:text-base font-medium tracking-wide text-white/90 group-hover:text-white transition-colors">
                Game archive
              </span>
              <span className="relative inline-flex items-center px-2 py-0.5 rounded-lg border border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 via-sky-500/15 to-blue-500/20 shadow-[0_0_12px_rgba(6,182,212,0.35)] backdrop-blur-sm group-hover:border-cyan-300 group-hover:shadow-[0_0_18px_rgba(6,182,212,0.55)] transition-all">
                <span className="font-orbitron text-xs sm:text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
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
                  ? 'border border-cyan-400/40 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
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
                  ? 'border border-cyan-400/40 bg-cyan-500/20 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'border border-transparent text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ListTodo size={15} />
              <span>Список игр</span>
            </Link>
          </nav>

          {/* Авторизация */}
          <div className="flex items-center gap-3 shrink-0">
            {!loading && (
              user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-2 text-sm text-white/50 font-mono">
                    <User size={14} className="text-cyan-400/80" />
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
                  className="flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/30 hover:border-cyan-300 hover:text-white shadow-[0_0_14px_rgba(6,182,212,0.25)]"
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
