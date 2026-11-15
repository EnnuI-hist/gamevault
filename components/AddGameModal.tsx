'use client';

import { useState, useRef } from 'react';
import { X, Plus, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';

interface AddGameModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddGameModal({ onClose, onAdded }: AddGameModalProps) {
  const [title, setTitle] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleCover = (file: File) => {
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError('');

    try {
      let cover_url: string | null = null;

      if (coverFile) {
        const ext = coverFile.name.split('.').pop();
        const path = `covers/${slugify(title)}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('screenshots')
          .upload(path, coverFile, { cacheControl: '3600', upsert: false });

        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabase.storage
          .from('screenshots')
          .getPublicUrl(path);
        cover_url = publicUrl;
      }

      const { error: dbErr } = await supabase.from('games').insert({
        title: title.trim(),
        slug: slugify(title),
        cover_url,
      });

      if (dbErr) throw dbErr;

      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d111a]/95 backdrop-blur-xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl border border-transparent p-1.5 text-white/40 transition-all duration-200 hover:border-white/10 hover:bg-white/10 hover:text-white active:scale-95"
        >
          <X size={18} />
        </button>

        <h2 className="mb-6 text-xl font-bold text-white font-fantasy">Добавить игру</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Название игры</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Elden Ring"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder-white/30 outline-none transition neon-ring-focus focus:bg-white/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">Обложка (необязательно)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCover(e.target.files[0])}
            />
            {coverPreview ? (
              <div className="relative h-44 overflow-hidden rounded-xl border border-white/10">
                <Image src={coverPreview} alt="Обложка" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview(''); }}
                  className="absolute right-2 top-2 rounded-xl bg-black/70 backdrop-blur-md p-1.5 text-white hover:bg-black/90 active:scale-95 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-6 text-white/40 transition-all duration-200 hover:border-[var(--neon-primary)] hover:bg-white/5 hover:text-[var(--neon-text)] active:scale-95 cursor-pointer"
              >
                <Upload size={20} />
                <span className="text-xs font-medium">Выбрать обложку</span>
              </button>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition disabled:opacity-50 neon-btn-primary active:scale-95 cursor-pointer shadow-md"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {loading ? 'Создание...' : 'Создать игру'}
          </button>
        </form>
      </div>
    </div>
  );
}
