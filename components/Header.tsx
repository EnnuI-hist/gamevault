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
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0c10]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          {/* Логотип */}
          <Link href="/" prefetch={false} className="flex items-center gap-2 group shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 group-hover:bg-indigo-500 transition-colors">
              <Gamepad2 size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white hidden xs:inline sm:inline">
              GameVault
            </span>
          </Link>

          {/* Навигационные табы: Витрина vs Список игр */}
          <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            <Link
              href="/"
              prefetch={false}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all ${
                isShowcase
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
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
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
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
                  <div className="hidden md:flex items-center gap-2 text-sm text-white/50">
                    <User size={14} />
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
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                  <LogIn size={14} />
                  Войти
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
