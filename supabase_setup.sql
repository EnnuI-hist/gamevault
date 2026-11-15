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
  status      text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'playing', 'planned', 'dropped')),
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Миграция на случай, если таблица games уже существовала без status:
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'
  CHECK (status IN ('completed', 'playing', 'planned', 'dropped'));

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
  media_type   text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  created_at   timestamptz DEFAULT now() NOT NULL
);

-- Миграция на случай, если таблица screenshots уже существовала без media_type:
ALTER TABLE public.screenshots
ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image'
  CHECK (media_type IN ('image', 'video'));

CREATE INDEX IF NOT EXISTS screenshots_game_id_idx ON public.screenshots(game_id);
CREATE INDEX IF NOT EXISTS screenshots_created_at_idx ON public.screenshots(created_at DESC);

-- 3. Таблица сохранений игр (Game Saves)
CREATE TABLE IF NOT EXISTS public.game_saves (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id      uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  file_name    text NOT NULL,
  file_url     text NOT NULL,
  storage_path text NOT NULL,
  description  text DEFAULT '',
  file_size    bigint,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS game_saves_game_id_idx ON public.game_saves(game_id);
CREATE INDEX IF NOT EXISTS game_saves_created_at_idx ON public.game_saves(created_at DESC);

-- 4. Таблица бэклога / вертикального списка игр (Game Backlog)
CREATE TABLE IF NOT EXISTS public.game_backlog (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title      text NOT NULL,
  status     text NOT NULL DEFAULT 'planned' CHECK (status IN ('completed', 'playing', 'planned', 'dropped')),
  note       text DEFAULT '',
  cover_url  text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Миграция на добавление обложки в game_backlog
ALTER TABLE public.game_backlog ADD COLUMN IF NOT EXISTS cover_url text;

CREATE INDEX IF NOT EXISTS game_backlog_status_idx ON public.game_backlog(status);
CREATE INDEX IF NOT EXISTS game_backlog_created_at_idx ON public.game_backlog(created_at DESC);

-- ============================================================
-- RLS: включаем Row Level Security
-- ============================================================

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_backlog ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "games_public_read"  ON public.games;
DROP POLICY IF EXISTS "games_owner_insert" ON public.games;
DROP POLICY IF EXISTS "games_owner_update" ON public.games;
DROP POLICY IF EXISTS "games_owner_delete" ON public.games;

DROP POLICY IF EXISTS "screenshots_public_read"  ON public.screenshots;
DROP POLICY IF EXISTS "screenshots_owner_insert" ON public.screenshots;
DROP POLICY IF EXISTS "screenshots_owner_update" ON public.screenshots;
DROP POLICY IF EXISTS "screenshots_owner_delete" ON public.screenshots;

DROP POLICY IF EXISTS "game_saves_public_read"  ON public.game_saves;
DROP POLICY IF EXISTS "game_saves_owner_insert" ON public.game_saves;
DROP POLICY IF EXISTS "game_saves_owner_update" ON public.game_saves;
DROP POLICY IF EXISTS "game_saves_owner_delete" ON public.game_saves;

DROP POLICY IF EXISTS "game_backlog_public_read"  ON public.game_backlog;
DROP POLICY IF EXISTS "game_backlog_owner_insert" ON public.game_backlog;
DROP POLICY IF EXISTS "game_backlog_owner_update" ON public.game_backlog;
DROP POLICY IF EXISTS "game_backlog_owner_delete" ON public.game_backlog;

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

-- Game Saves: читают все, пишут только аутентифицированные
CREATE POLICY "game_saves_public_read"
  ON public.game_saves FOR SELECT
  USING (true);

CREATE POLICY "game_saves_owner_insert"
  ON public.game_saves FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "game_saves_owner_update"
  ON public.game_saves FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "game_saves_owner_delete"
  ON public.game_saves FOR DELETE
  USING (auth.role() = 'authenticated');

-- Game Backlog: читают все, пишут только аутентифицированные
CREATE POLICY "game_backlog_public_read"
  ON public.game_backlog FOR SELECT
  USING (true);

CREATE POLICY "game_backlog_owner_insert"
  ON public.game_backlog FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "game_backlog_owner_update"
  ON public.game_backlog FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "game_backlog_owner_delete"
  ON public.game_backlog FOR DELETE
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
