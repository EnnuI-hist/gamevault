export type VideoProvider = 'youtube' | 'drive' | 'rutube' | 'direct';

export interface VideoParsedInfo {
  provider: VideoProvider;
  id: string | null;
  embedUrl: string;
  thumbnailUrl: string | null;
  platformName: string;
}

/**
 * Парсит ссылки на видео (YouTube, Rutube, Google Диск, прямые ссылки)
 */
export function parseVideoUrl(rawUrl: string): VideoParsedInfo {
  const url = (rawUrl || '').trim();

  // 1. YouTube (watch, youtu.be, shorts, embed, live)
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1];
    return {
      provider: 'youtube',
      id,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      platformName: 'YouTube',
    };
  }

  // 2. Google Диск
  const driveMatch = url.match(
    /(?:drive|docs)\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+))/i
  );
  if (driveMatch) {
    const id = driveMatch[1] || driveMatch[2];
    return {
      provider: 'drive',
      id,
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      thumbnailUrl: null,
      platformName: 'Google Диск',
    };
  }

  // 3. Rutube
  const rutubeMatch = url.match(
    /rutube\.ru\/(?:video\/(?:private\/)?|play\/embed\/)([a-zA-Z0-9_-]+)/i
  );
  if (rutubeMatch && rutubeMatch[1]) {
    const id = rutubeMatch[1];
    return {
      provider: 'rutube',
      id,
      embedUrl: `https://rutube.ru/play/embed/${id}/?autoPlay=1`,
      thumbnailUrl: null,
      platformName: 'Rutube',
    };
  }

  // 4. Cloudinary Video
  if (
    url.includes('cloudinary.com') &&
    (url.includes('/video/upload/') || /\.(mp4|webm|mov)(\?.*)?$/i.test(url))
  ) {
    return {
      provider: 'direct',
      id: null,
      embedUrl: url,
      thumbnailUrl: url
        .replace('/video/upload/', '/video/upload/so_0/')
        .replace(/\.(mp4|webm|mov)(\?.*)?$/i, '.jpg'),
      platformName: 'Cloudinary',
    };
  }

  // 5. Прямая ссылка на видео или неизвестный URL
  return {
    provider: 'direct',
    id: null,
    embedUrl: url,
    thumbnailUrl: null,
    platformName: 'Прямая ссылка',
  };
}

/**
 * Проверяет, является ли строка корректным http/https URL
 */
export function isValidHttpUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
