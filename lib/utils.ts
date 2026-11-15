export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Заменяет домен Supabase (https://supabase.co или *.supabase.co) в ссылке
 * на текущий process.env.NEXT_PUBLIC_SUPABASE_URL (если они отличаются),
 * обеспечивая корректное отображение через настроенный прокси.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  const currentBase = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
  if (!currentBase) return url;

  try {
    const parsed = new URL(url);
    const currentParsed = new URL(currentBase);

    // Проверяем, является ли домен хостом Supabase (supabase.co или [project].supabase.co)
    const isSupabaseHost =
      parsed.hostname === 'supabase.co' ||
      parsed.hostname.endsWith('.supabase.co');

    if (isSupabaseHost && parsed.origin !== currentParsed.origin) {
      return `${currentBase}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    if (url.includes('supabase.co')) {
      return url.replace(/https?:\/\/[a-zA-Z0-9.-]*supabase\.co/, currentBase);
    }
  }

  return url;
}

export async function downloadFile(url: string, filename: string): Promise<void> {
  const resolvedUrl = resolveMediaUrl(url);
  const response = await fetch(resolvedUrl);
  if (!response.ok) {
    throw new Error(`Не удалось скачать файл: ${response.statusText}`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
}
