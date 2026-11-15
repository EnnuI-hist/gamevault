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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#131720] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <h2 className="mb-6 text-xl font-bold text-white">Добавить игру</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-white/60">Название игры</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Elden Ring"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition neon-ring-focus"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-white/60">Обложка (необязательно)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCover(e.target.files[0])}
            />
            {coverPreview ? (
              <div className="relative h-44 overflow-hidden rounded-lg">
                <Image src={coverPreview} alt="Обложка" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview(''); }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 py-6 text-white/40 transition hover:border-[var(--neon-primary)] hover:text-[var(--neon-text)]"
              >
                <Upload size={20} />
                <span className="text-sm">Выбрать обложку</span>
              </button>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition disabled:opacity-50 neon-btn-primary"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {loading ? 'Создание...' : 'Создать игру'}
          </button>
        </form>
      </div>
    </div>
  );
}
