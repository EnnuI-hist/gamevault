import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const fallbackUrl = 'https://workers.dev';
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/+$/, '')
    : '';
  const supabaseUrl = rawUrl && rawUrl.startsWith('http') ? rawUrl : fallbackUrl;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim()
    : '';
  const supabaseKey = rawKey || 'sb_publishable_dKdBeZegRjba6eNK-iY43A_88o01t7j';

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Игнорируем ошибки в Server Components
          }
        },
      },
    }
  );
}
