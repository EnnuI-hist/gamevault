'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogIn, LogOut, User, Gamepad2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import AuthModal from './AuthModal';

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0c10]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 group-hover:bg-indigo-500 transition-colors">
              <Gamepad2 size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              GameVault
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {!loading && (
              user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 text-sm text-white/50">
                    <User size={14} />
                    <span className="max-w-[160px] truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <LogOut size={14} />
                    <span className="hidden sm:inline">Выйти</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
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
