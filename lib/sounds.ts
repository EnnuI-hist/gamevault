/**
 * UI Sound Effects Engine for Game archive EnnuI
 * Based on Web Audio API (zero external audio files).
 * Velvety, warm, deep console aesthetics inspired by PS5 / Steam Big Picture / FromSoftware.
 */

const STORAGE_KEY = 'gamevault_sound';
const HOVER_THROTTLE_MS = 70;

let audioCtx: AudioContext | null = null;
let lastHoverTime = 0;
let noiseBuffer: AudioBuffer | null = null;

/** Проверка, включен ли звук (по умолчанию true) */
export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

/** Включить или выключить звук */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent('gamevault_sound_change', { detail: { enabled } })
    );
  } catch {}
}

/** Переключить звук в один клик */
export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  return next;
}

/**
 * Инициализирует и возвращает AudioContext.
 * Чтобы в консоли браузера не было предупреждений, контекст создаётся и возобновляется
 * только при реальном взаимодействии пользователя.
 */
function getAudioContext(resumeIfSuspended = true): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }

  if (resumeIfSuspended && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

// Автоматическая тихая инициализация контекста по первому пользовательскому клику/тапу
if (typeof window !== 'undefined') {
  const handleFirstGesture = () => {
    getAudioContext(true);
    window.removeEventListener('pointerdown', handleFirstGesture);
    window.removeEventListener('keydown', handleFirstGesture);
  };
  window.addEventListener('pointerdown', handleFirstGesture, { once: true, passive: true });
  window.addEventListener('keydown', handleFirstGesture, { once: true, passive: true });
}

/**
 * 1. playHover()
 * Еле слышный глухой тактильный клик при наведении на карточку игры или вкладку.
 * Ограничение спама: не чаще раза в 70 мс.
 * Низкие частоты (130 -> 65 Гц), ФНЧ фильтр 320 Гц, мягкий бархатный спад.
 */
export function playHover(): void {
  if (!isSoundEnabled()) return;

  const now = Date.now();
  if (now - lastHoverTime < HOVER_THROTTLE_MS) return;
  lastHoverTime = now;

  // Если контекст ещё не активирован кликом пользователя, не форсируем suspended предупреждение
  if (!audioCtx || audioCtx.state !== 'running') return;

  try {
    const ctx = audioCtx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Мягкий ФНЧ (срезает все верха, оставляя только глухой бархатный тактильный отклик)
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);
    filter.Q.setValueAtTime(1, t);

    // Глубокий питч-дроп: 130 Гц -> 65 Гц
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.035);

    // Очень тихая, плавная огибающая
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.045, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.038);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);

    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  } catch {}
}

/**
 * 2. playClick()
 * Мягкий глубокий щелчок с тёплым резонансом при нажатии на кнопки, открытии игры,
 * переключении тем или обоев.
 * Два генератора: низкий глубокий удар (160 -> 75 Гц) + тёплый механический резонанс.
 */
export function playClick(): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext(true);
  if (!ctx) return;

  try {
    const t = ctx.currentTime;

    // Генератор 1: Низкое плотное тело щелчка
    const oscBody = ctx.createOscillator();
    const gainBody = ctx.createGain();
    const filterBody = ctx.createBiquadFilter();

    filterBody.type = 'lowpass';
    filterBody.frequency.setValueAtTime(420, t);
    filterBody.Q.setValueAtTime(1.4, t);

    oscBody.type = 'sine';
    oscBody.frequency.setValueAtTime(160, t);
    oscBody.frequency.exponentialRampToValueAtTime(75, t + 0.06);

    gainBody.gain.setValueAtTime(0.0001, t);
    gainBody.gain.exponentialRampToValueAtTime(0.08, t + 0.003);
    gainBody.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

    oscBody.connect(filterBody);
    filterBody.connect(gainBody);
    gainBody.connect(ctx.destination);

    // Генератор 2: Тёплый тактильный переходный щелчок (без резкого треска)
    const oscClick = ctx.createOscillator();
    const gainClick = ctx.createGain();
    const filterClick = ctx.createBiquadFilter();

    filterClick.type = 'bandpass';
    filterClick.frequency.setValueAtTime(260, t);
    filterClick.Q.setValueAtTime(1.8, t);

    oscClick.type = 'triangle';
    oscClick.frequency.setValueAtTime(240, t);
    oscClick.frequency.exponentialRampToValueAtTime(110, t + 0.025);

    gainClick.gain.setValueAtTime(0.0001, t);
    gainClick.gain.exponentialRampToValueAtTime(0.055, t + 0.002);
    gainClick.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

    oscClick.connect(filterClick);
    filterClick.connect(gainClick);
    gainClick.connect(ctx.destination);

    oscBody.start(t);
    oscClick.start(t);
    oscBody.stop(t + 0.075);
    oscClick.stop(t + 0.03);

    oscBody.onended = () => {
      oscBody.disconnect();
      filterBody.disconnect();
      gainBody.disconnect();
      oscClick.disconnect();
      filterClick.disconnect();
      gainClick.disconnect();
    };
  } catch {}
}

/** Генератор буфера сглаженного розово-коричневого шума для воздушного свуша */
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.22);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.035 * white) / 1.035;
    data[i] = lastOut * 3.8;
  }
  noiseBuffer = buffer;
  return buffer;
}

/**
 * 3. playSwipe()
 * Мягкий воздушный «свуш» (фильтрованный шум с плавным затуханием) при перелистывании
 * скриншотов стрелками в Lightbox.
 */
export function playSwipe(): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext(true);
  if (!ctx) return;

  try {
    const t = ctx.currentTime;
    const buffer = getNoiseBuffer(ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Полосовой фильтр с плавным движением вниз: 560 -> 210 Гц
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.4, t);
    filter.frequency.setValueAtTime(560, t);
    filter.frequency.exponentialRampToValueAtTime(210, t + 0.18);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.065, t + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(t);
    source.stop(t + 0.21);

    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  } catch {}
}

/**
 * 4. playSuccess()
 * Благородный мягкий двухнотный аккорд при завершении загрузки скринов/сейвов,
 * смене статуса игры на «Пройдено» или вручении золотой медали.
 * F4 (349 Гц) + C5 (523 Гц) с мягким 65 мс арпеджио и плавным затуханием.
 */
export function playSuccess(): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext(true);
  if (!ctx) return;

  try {
    const t = ctx.currentTime;

    // Общий фильтр низких частот для тёплой бархатной окраски
    const masterFilter = ctx.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.setValueAtTime(750, t);
    masterFilter.Q.setValueAtTime(0.8, t);
    masterFilter.connect(ctx.destination);

    // Нота 1: F4 (349.23 Гц)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(349.23, t);

    gain1.gain.setValueAtTime(0.0001, t);
    gain1.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);

    osc1.connect(gain1);
    gain1.connect(masterFilter);

    // Басовая гармоника для глубины: F3 (174.61 Гц)
    const oscSub = ctx.createOscillator();
    const gainSub = ctx.createGain();
    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(174.61, t);

    gainSub.gain.setValueAtTime(0.0001, t);
    gainSub.gain.exponentialRampToValueAtTime(0.04, t + 0.02);
    gainSub.gain.exponentialRampToValueAtTime(0.0001, t + 0.40);

    oscSub.connect(gainSub);
    gainSub.connect(masterFilter);

    // Нота 2: C5 (523.25 Гц) — вступает через 65 мс
    const t2 = t + 0.065;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, t2);

    gain2.gain.setValueAtTime(0.0001, t);
    gain2.gain.setValueAtTime(0.0001, t2);
    gain2.gain.exponentialRampToValueAtTime(0.09, t2 + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.55);

    osc2.connect(gain2);
    gain2.connect(masterFilter);

    osc1.start(t);
    oscSub.start(t);
    osc2.start(t2);

    osc1.stop(t + 0.46);
    oscSub.stop(t + 0.41);
    osc2.stop(t2 + 0.56);

    osc2.onended = () => {
      osc1.disconnect();
      gain1.disconnect();
      oscSub.disconnect();
      gainSub.disconnect();
      osc2.disconnect();
      gain2.disconnect();
      masterFilter.disconnect();
    };
  } catch {}
}
