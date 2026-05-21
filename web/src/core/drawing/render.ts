/* Modified by noname009 (https://github.com/noname009) in 2026.
 * Part of a GPL-3.0 fork of https://github.com/jeonghyeon-net/exif-frame. */

import Photo from '../photo';
import resize from './resize';
import { Store } from '../../store';
import { ThemeFunc } from './theme';
import { ThemeOptionInput } from '../../pages/theme/types/theme-option';

// 웹폰트(특히 한글 폰트)가 Canvas에 정확히 적용되려면 폰트 로딩 완료 후 그려야 함.
// 사용자가 옵션에서 선택할 수 있는 모든 폰트를 미리 로드 큐에 넣어둔다.
const FONTS_TO_PRELOAD = [
  '12px "Noto Serif KR"',
  '12px "Nanum Myeongjo"',
  '12px "Nanum Gothic"',
  '12px "IBM Plex Sans KR"',
  '12px "Noto Sans KR"',
  '12px "IBM Plex Sans"',
  '12px "IBM Plex Mono"',
  '12px "JetBrains Mono"',
];

let preloadPromise: Promise<unknown> | null = null;
function preloadWebFonts(): Promise<unknown> {
  if (preloadPromise) return preloadPromise;
  if (typeof document === 'undefined' || !document.fonts) {
    preloadPromise = Promise.resolve();
    return preloadPromise;
  }
  preloadPromise = Promise.all(
    FONTS_TO_PRELOAD.map((f) => document.fonts.load(f).catch(() => null))
  );
  return preloadPromise;
}

const render = async (func: ThemeFunc, photo: Photo, option: ThemeOptionInput, store: Store): Promise<HTMLCanvasElement> => {
  // 웹폰트가 로드되기 전에 그리면 Canvas는 시스템 fallback 폰트로 그려진다.
  // 모든 후보 폰트를 한 번 로드해두면 이후 ctx.font에서 자유롭게 선택 가능.
  await preloadWebFonts();

  let canvas = func(photo, option, store);

  if (store.fixWatermark && store.watermark) {
    const context = canvas.getContext('2d')!;
    const fontSize = 100;
    context.fillStyle = '#ffffff';
    context.shadowColor = '#000000';
    context.shadowBlur = 10;
    context.lineWidth = 5;
    context.font = `normal 500 ${fontSize}px Barlow`;
    context.textAlign = 'right';
    context.textBaseline = 'bottom';
    context.fillText(store.watermark, canvas.width - fontSize / 2, canvas.height - fontSize / 2);
    context.shadowBlur = 0;
  }

  if (store.fixImageWidth && store.imageWidth) {
    if (canvas.width > canvas.height) {
      const targetWidth = store.imageWidth > 4096 ? 4096 : store.imageWidth;
      const targetHeight = (targetWidth * canvas.height) / canvas.width;
      canvas = resize(canvas, targetWidth, targetHeight);
    } else {
      const targetHeight = store.imageWidth > 4096 ? 4096 : store.imageWidth; // This is a naming bug
      const targetWidth = (targetHeight * canvas.width) / canvas.height;
      canvas = resize(canvas, targetWidth, targetHeight);
    }
  }

  return canvas;
};

export default render;
