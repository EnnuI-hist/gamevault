'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const fallbackUrl = 'https://workers.dev';
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/+$/, '')
    : '';
  const supabaseUrl = rawUrl && rawUrl.startsWith('http') ? rawUrl : fallbackUrl;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim()
    : '';
  const supabaseKey = rawKey || 'sb_publishable_dKdBeZegRjba6eNK-iY43A_88o01t7j';

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
