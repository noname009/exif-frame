/* Modified by noname009 (https://github.com/noname009) in 2026.
 * Part of a GPL-3.0 fork of https://github.com/jeonghyeon-net/exif-frame. */

/**
 * Font loading — performance optimized, safe version.
 *
 * Strategy:
 *  1. Defer font loading until after first paint via requestIdleCallback
 *  2. Use font-display: swap so the UI never blocks on fonts
 *  3. Only load Pretendard when the active locale is Korean
 *  4. Use TTF directly — the FontFace API's `local() / url() / url()`
 *     fallback string is supported, but mixing format() hints with
 *     non-existent files can fail silently on some browsers.
 *
 * License note:
 *   Previously this file referenced three additional fonts (digital-7,
 *   poxel, din-alternate-bold) but those files were removed in 0.15.15
 *   because their licenses do not permit redistribution.
 *   Only Pretendard remains (SIL Open Font License 1.1 — redistribution
 *   permitted with the accompanying license file).
 */

enum Font {
  Pretendard = 'pretendard',
}

// Small fonts loaded right after first paint (currently none).
const LIGHT_FONTS: Font[] = [];

// Heavy locale-specific fonts loaded only when needed
const HEAVY_FONTS: Record<string, Font[]> = {
  ko: [Font.Pretendard],
};

const loadedFonts = new Set<string>();

function loadFont(font: Font): Promise<void> {
  if (loadedFonts.has(font)) return Promise.resolve();
  loadedFonts.add(font);

  // Prefer woff2 if present, fall back to ttf. The browser will request
  // woff2 first; if that 404s, the fetch fails — the catch below keeps
  // it non-fatal. Most users will still get the ttf via the second URL
  // when the WOFF2 source is omitted.
  const face = new FontFace(font, `url(fonts/${font}.ttf)`, { display: 'swap' });
  return face
    .load()
    .then((loaded) => {
      document.fonts.add(loaded);
    })
    .catch((err) => {
      // Non-fatal: UI falls back to system fonts
      // eslint-disable-next-line no-console
      console.warn(`Font ${font} failed to load:`, err);
    });
}

function scheduleFontLoading(): void {
  const language = localStorage.getItem('language') || navigator.language.split('-')[0] || 'en';
  const heavyForLocale = HEAVY_FONTS[language] || [];

  const idle = (cb: () => void) => {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => void };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(cb);
    } else {
      setTimeout(cb, 100);
    }
  };

  // First wave: small fonts soon after paint
  idle(() => {
    LIGHT_FONTS.forEach(loadFont);
  });

  // Second wave: heavy locale-specific fonts on a longer delay
  idle(() => {
    setTimeout(() => {
      heavyForLocale.forEach(loadFont);
    }, 300);
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    scheduleFontLoading();
  } else {
    window.addEventListener('load', scheduleFontLoading, { once: true });
  }
}

export async function ensureFont(font: Font): Promise<void> {
  return loadFont(font);
}

export default Font;