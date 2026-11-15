'use client';

import { createBrowserClient } from '@supabase/ssr';

const DEFAULT_SUPABASE_URL = 'https://husdzyczmhkkpgxhndvw.supabase.co';
const DEFAULT_ANON_KEY = 'sb_publishable_dKdBeZegRjba6eNK-iY43A_88o01t7j';

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/+$/, '')
    : '';

  // Если URL пустой, кривой или без ID проекта (https://supabase.co / https://workers.dev) — принудительно используем реальный URL проекта
  const isInvalidUrl =
    !rawUrl ||
    rawUrl === 'https://supabase.co' ||
    rawUrl === 'http://supabase.co' ||
    rawUrl === 'https://workers.dev' ||
    !rawUrl.startsWith('http');

  const supabaseUrl = isInvalidUrl ? DEFAULT_SUPABASE_URL : rawUrl;

  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim()
    : '';
  const supabaseKey = rawKey || DEFAULT_ANON_KEY;

  return createBrowserClient(
    supabaseUrl,
    supabaseKey,
    {
      global: {
        fetch: (url, options) => {
          return fetch(url, {
            ...options,
            cache: 'no-store',
          });
        },
      },
    }
  );
}
