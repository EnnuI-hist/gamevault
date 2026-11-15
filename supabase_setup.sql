-- ============================================================
-- GameVault — Supabase Setup Script
-- Выполни этот скрипт в Supabase SQL Editor
-- ============================================================

-- 1. Таблица игр
CREATE TABLE IF NOT EXISTS public.games (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  slug        text NOT NULL UNIQUE,
  cover_url   text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- 2. Таблица скриншотов
CREATE TABLE IF NOT EXISTS public.screenshots (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id      uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url   text NOT NULL,
  caption      text DEFAULT '' NOT NULL,
  width        integer,
  height       integer,
  size_bytes   bigint,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS screenshots_game_id_idx ON public.screenshots(game_id);
CREATE INDEX IF NOT EXISTS screenshots_created_at_idx ON public.screenshots(created_at DESC);

-- ============================================================
-- RLS: включаем Row Level Security
-- ============================================================

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "games_public_read"  ON public.games;
DROP POLICY IF EXISTS "games_owner_insert" ON public.games;
DROP POLICY IF EXISTS "games_owner_update" ON public.games;
DROP POLICY IF EXISTS "games_owner_delete" ON public.games;

DROP POLICY IF EXISTS "screenshots_public_read"  ON public.screenshots;
DROP POLICY IF EXISTS "screenshots_owner_insert" ON public.screenshots;
DROP POLICY IF EXISTS "screenshots_owner_update" ON public.screenshots;
DROP POLICY IF EXISTS "screenshots_owner_delete" ON public.screenshots;

-- Games: читают все, пишут только аутентифицированные
CREATE POLICY "games_public_read"
  ON public.games FOR SELECT
  USING (true);

CREATE POLICY "games_owner_insert"
  ON public.games FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "games_owner_update"
  ON public.games FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "games_owner_delete"
  ON public.games FOR DELETE
  USING (auth.role() = 'authenticated');

-- Screenshots: читают все, пишут только аутентифицированные
CREATE POLICY "screenshots_public_read"
  ON public.screenshots FOR SELECT
  USING (true);

CREATE POLICY "screenshots_owner_insert"
  ON public.screenshots FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "screenshots_owner_update"
  ON public.screenshots FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "screenshots_owner_delete"
  ON public.screenshots FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- Storage: бакет для скриншотов и обложек
-- ============================================================

-- Создаём публичный бакет
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screenshots',
  'screenshots',
  true,
  52428800,  -- 50 MB на файл
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS политики
DROP POLICY IF EXISTS "storage_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "storage_owner_insert"  ON storage.objects;
DROP POLICY IF EXISTS "storage_owner_delete"  ON storage.objects;

CREATE POLICY "storage_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'screenshots');

CREATE POLICY "storage_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'screenshots' AND auth.role() = 'authenticated');

CREATE POLICY "storage_owner_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'screenshots' AND auth.role() = 'authenticated');

CREATE POLICY "storage_owner_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'screenshots' AND auth.role() = 'authenticated');
