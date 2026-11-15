'use client';

import { useState } from 'react';
import { X, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await signIn(email, password);
    if (error) {
      setError('Неверный email или пароль');
    } else {
      onClose();
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d111a]/95 backdrop-blur-xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl border border-transparent p-1.5 text-white/40 transition-all duration-200 hover:border-white/10 hover:bg-white/10 hover:text-white active:scale-95"
        >
          <X size={18} />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-white font-fantasy">Вход</h2>
          <p className="mt-1 text-xs text-white/50 font-mono">Только для владельца архива</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition neon-ring-focus focus:bg-white/10"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition neon-ring-focus focus:bg-white/10"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition disabled:opacity-60 neon-btn-primary active:scale-95 cursor-pointer shadow-md"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} className="text-[var(--neon-text)]" />}
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
