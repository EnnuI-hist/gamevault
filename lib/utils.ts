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
 * Заменяет домен в ссылках на картинки и файлы из Supabase Storage
 * на прокси-адрес через регулярное выражение без использования new URL().
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (url.includes('/storage/v1/object/public/')) {
    const rawEnv = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
    const proxyBase = rawEnv && !rawEnv.includes('supabase.co') ? rawEnv : 'https://workers.dev';
    return url.replace(/^https?:\/\/[^/]+/, proxyBase);
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
