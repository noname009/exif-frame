/*
 * Copyright (C) 2026 noname009 (https://github.com/noname009)
 *
 * This file is part of a modified fork of EXIF Frame
 * (original: https://github.com/jeonghyeon-net/exif-frame).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the
 * implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import Photo from '../../core/photo';
import { Store } from '../../store';
import sandbox from '../../core/drawing/sandbox';
import { ThemeFunc } from '../../core/drawing/theme';
import { ThemeOption, ThemeOptionInput } from '../../pages/theme/types/theme-option';
import { FONT_LABELS, resolveFontFamily } from '../_shared/fonts';

/**
 * Architecture Grid — 건축 도면식.
 *
 *  ┌────────────────────────────────┐
 *  │ ┌──────────┐                   │
 *  │ │ CAPTION  │                   │  ← 좌상단 캡션 박스 (테두리)
 *  │ │ ──────   │                   │
 *  │ │ 2026     │                   │
 *  │ └──────────┘                   │
 *  │  ┌──────────────────────────┐  │
 *  │  │                          │  │
 *  │  │          Photo           │  │  ← 사진 (격자 안에)
 *  │  │                          │  │
 *  │  └──────────────────────────┘  │
 *  │                  ┌───────────┐ │
 *  │                  │ X-T3      │ │  ← 우하단 메타 박스
 *  │                  │ 33mm F5.6 │ │
 *  │                  └───────────┘ │
 *  │ +    corner marker    + │      │  ← 코너 마커들
 *  └────────────────────────────────┘
 *
 * 건축 도면 / 디자인 명세서 느낌.
 */

const GRID_OPTIONS: ThemeOption[] = [
  // ── 외형 ──
  { id: 'DARK_MODE', type: 'boolean', default: true, label: '다크 모드', group: '외형', description: '도면지 ↔ 청사진' },

  // ── 캡션 박스 (좌상단) ──
  { id: 'CAPTION',           type: 'string', default: 'SEOUL\\nKOREA', label: '캡션', group: '캡션 박스 (좌상단)', description: '\\n 줄바꿈' },
  { id: 'YEAR_OVERRIDE',     type: 'string', default: '', label: '년도 (수동)', group: '캡션 박스 (좌상단)' },
  { id: 'CAPTION_FONT_SIZE', type: 'number', default: 90, label: '폰트 크기',  group: '캡션 박스 (좌상단)', description: 'px' },

  // ── 메타 박스 (우하단) ──
  { id: 'SHOW_META_BOX', type: 'boolean', default: true, label: '메타 박스 표시', group: '메타 박스 (우하단)' },
  { id: 'META_FONT_SIZE', type: 'number', default: 70, label: '폰트 크기',       group: '메타 박스 (우하단)', description: 'px' },

  // ── 폰트 ──
  { id: 'FONT', type: 'select', default: FONT_LABELS[0], options: FONT_LABELS, label: '폰트', group: '폰트' },

  // ── 마커 / 격자 ──
  { id: 'SHOW_CORNER_MARKERS', type: 'boolean', default: false, label: '코너 마커', group: '마커 / 격자' },
  { id: 'SHOW_GRID',           type: 'boolean', default: false, label: '격자선',    group: '마커 / 격자' },
  { id: 'GRID_SIZE',           type: 'number',  default: 100,   label: '격자 간격', group: '마커 / 격자', description: 'px' },

  // ── 레이아웃 ──
  { id: 'OUTER_MARGIN', type: 'number',       default: 120, label: '외곽 여백',       group: '레이아웃', description: 'px' },
  { id: 'BOX_PADDING',  type: 'number',       default: 24,  label: '박스 내부 패딩',  group: '레이아웃', description: 'px' },
  { id: 'PHOTO_INSET',  type: 'number',       default: 80,  label: '사진 ↔ 박스',     group: '레이아웃', description: 'px' },
  { id: 'LINE_WEIGHT',  type: 'range-slider', min: 0.5, max: 3, step: 0.5, default: 1, label: '선 두께', group: '레이아웃' },
];

const GRID_FUNC: ThemeFunc = (photo: Photo, input: ThemeOptionInput, store: Store) => {
  const DARK_MODE = input.get('DARK_MODE') as boolean;
  const FONT_LABEL = input.get('FONT') as string;
  const CAPTION = input.get('CAPTION') as string;
  const YEAR_OVERRIDE = (input.get('YEAR_OVERRIDE') as string).trim();
  const CAPTION_FONT_SIZE = input.get('CAPTION_FONT_SIZE') as number;
  const SHOW_META_BOX = input.get('SHOW_META_BOX') as boolean;
  const META_FONT_SIZE = input.get('META_FONT_SIZE') as number;
  const SHOW_CORNER_MARKERS = input.get('SHOW_CORNER_MARKERS') as boolean;
  const SHOW_GRID = input.get('SHOW_GRID') as boolean;
  const GRID_SIZE = input.get('GRID_SIZE') as number;
  const OUTER_MARGIN = input.get('OUTER_MARGIN') as number;
  const BOX_PADDING = input.get('BOX_PADDING') as number;
  const PHOTO_INSET = input.get('PHOTO_INSET') as number;
  const LINE_WEIGHT = input.get('LINE_WEIGHT') as number;

  const fontFamily = resolveFontFamily(FONT_LABEL);

  // 청사진(다크) ↔ 도면지(라이트)
  const BG       = DARK_MODE ? '#0e1a2b' : '#f4f1ea';
  const TEXT     = DARK_MODE ? '#cfe0f5' : '#1a1a1a';
  const LINE     = DARK_MODE ? '#3d5778' : '#1a1a1a';
  const GRID_LINE = DARK_MODE ? '#1f3151' : '#e0dcd2';

  const canvas = sandbox(photo, {
    targetRatio: store.ratio,
    notCroppedMode: store.notCroppedMode,
    backgroundColor: BG,
    padding: {
      top: OUTER_MARGIN + PHOTO_INSET,
      right: OUTER_MARGIN + PHOTO_INSET,
      bottom: OUTER_MARGIN + PHOTO_INSET,
      left: OUTER_MARGIN + PHOTO_INSET,
    },
  });

  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;

  // ===== 배경 격자 =====
  if (SHOW_GRID) {
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = LINE_WEIGHT * 0.5;
    for (let x = 0; x < W; x += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += GRID_SIZE) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  // ===== 코너 마커 (사진 영역의 네 모서리) =====
  if (SHOW_CORNER_MARKERS) {
    const px = OUTER_MARGIN + PHOTO_INSET;
    const py = OUTER_MARGIN + PHOTO_INSET;
    const pw = W - (OUTER_MARGIN + PHOTO_INSET) * 2;
    const ph = H - (OUTER_MARGIN + PHOTO_INSET) * 2;
    const ml = 36; // 마커 다리 길이
    ctx.strokeStyle = LINE;
    ctx.lineWidth = LINE_WEIGHT;
    function corner(x: number, y: number, dx: number, dy: number) {
      ctx.beginPath();
      ctx.moveTo(x - dx * ml, y); ctx.lineTo(x + dx * ml, y);
      ctx.moveTo(x, y - dy * ml); ctx.lineTo(x, y + dy * ml);
      ctx.stroke();
    }
    corner(px, py, 1, 1);
    corner(px + pw, py, 1, 1);
    corner(px, py + ph, 1, 1);
    corner(px + pw, py + ph, 1, 1);
  }

  // ===== 좌상단 캡션 박스 =====
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `600 ${CAPTION_FONT_SIZE}px ${fontFamily}`;
  const captionLines = CAPTION.replace(/\\n/g, '\n').split('\n');
  const year = YEAR_OVERRIDE || extractYear(photo.takenAt) || '';

  let maxCaptionW = 0;
  for (const l of captionLines) maxCaptionW = Math.max(maxCaptionW, ctx.measureText(l).width);
  ctx.font = `400 ${CAPTION_FONT_SIZE * 0.75}px ${fontFamily}`;
  if (year) maxCaptionW = Math.max(maxCaptionW, ctx.measureText(year).width);

  const capBoxW = maxCaptionW + BOX_PADDING * 2;
  const capBoxH = captionLines.length * CAPTION_FONT_SIZE * 1.15
    + (year ? CAPTION_FONT_SIZE * 0.95 : 0)
    + BOX_PADDING * 2;
  const capBoxX = OUTER_MARGIN;
  const capBoxY = OUTER_MARGIN;

  ctx.strokeStyle = LINE;
  ctx.lineWidth = LINE_WEIGHT;
  ctx.strokeRect(capBoxX, capBoxY, capBoxW, capBoxH);

  // 캡션 텍스트
  let lineY = capBoxY + BOX_PADDING + CAPTION_FONT_SIZE;
  ctx.fillStyle = TEXT;
  ctx.font = `600 ${CAPTION_FONT_SIZE}px ${fontFamily}`;
  for (const line of captionLines) {
    ctx.fillText(line, capBoxX + BOX_PADDING, lineY);
    lineY += CAPTION_FONT_SIZE * 1.15;
  }
  if (year) {
    ctx.font = `400 ${CAPTION_FONT_SIZE * 0.75}px ${fontFamily}`;
    ctx.fillStyle = withAlpha(TEXT, 0.6);
    // 짧은 hairline
    const sepY = lineY - CAPTION_FONT_SIZE * 0.5;
    ctx.beginPath();
    ctx.moveTo(capBoxX + BOX_PADDING, sepY);
    ctx.lineTo(capBoxX + BOX_PADDING + maxCaptionW * 0.4, sepY);
    ctx.stroke();
    lineY += CAPTION_FONT_SIZE * 0.2;
    ctx.fillText(year, capBoxX + BOX_PADDING, lineY);
  }

  // ===== 우하단 메타 박스 =====
  if (SHOW_META_BOX) {
    const camLine = [photo.make, photo.model].filter(Boolean).join(' ').trim().toUpperCase();
    const lensLine = (photo.lensModel || '').toUpperCase();
    const exifLine = !store.disableExposureMeter
      ? [photo.focalLength, photo.fNumber, photo.exposureTime, photo.iso].filter(Boolean).join('  ')
      : '';

    ctx.font = `600 ${META_FONT_SIZE}px ${fontFamily}`;
    const w1 = ctx.measureText(camLine).width;
    ctx.font = `400 ${META_FONT_SIZE * 0.85}px ${fontFamily}`;
    const w2 = ctx.measureText(lensLine).width;
    const w3 = ctx.measureText(exifLine).width;
    const maxW = Math.max(w1, w2, w3);

    const linesCount = (camLine ? 1 : 0) + (lensLine ? 1 : 0) + (exifLine ? 1 : 0);
    const boxW = maxW + BOX_PADDING * 2;
    const boxH = linesCount * META_FONT_SIZE * 1.4 + BOX_PADDING * 2 - META_FONT_SIZE * 0.4;
    const boxX = W - OUTER_MARGIN - boxW;
    const boxY = H - OUTER_MARGIN - boxH;

    ctx.strokeStyle = LINE;
    ctx.lineWidth = LINE_WEIGHT;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    let mY = boxY + BOX_PADDING + META_FONT_SIZE;
    ctx.fillStyle = TEXT;
    if (camLine) {
      ctx.font = `600 ${META_FONT_SIZE}px ${fontFamily}`;
      ctx.fillText(camLine, boxX + BOX_PADDING, mY);
      mY += META_FONT_SIZE * 1.4;
    }
    if (lensLine) {
      ctx.fillStyle = withAlpha(TEXT, 0.65);
      ctx.font = `400 ${META_FONT_SIZE * 0.85}px ${fontFamily}`;
      ctx.fillText(lensLine, boxX + BOX_PADDING, mY);
      mY += META_FONT_SIZE * 1.4;
    }
    if (exifLine) {
      ctx.fillStyle = TEXT;
      ctx.font = `500 ${META_FONT_SIZE * 0.85}px ${fontFamily}`;
      ctx.fillText(exifLine, boxX + BOX_PADDING, mY);
    }
  }

  return canvas;
};

function extractYear(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const m = dateStr.match(/(\d{4})/);
  return m ? m[1] : null;
}
function withAlpha(color: string, alpha: number): string {
  const c = color.trim();
  if (c.startsWith('#')) {
    let r: number, g: number, b: number;
    if (c.length === 4) { r = parseInt(c[1]+c[1],16); g = parseInt(c[2]+c[2],16); b = parseInt(c[3]+c[3],16); }
    else { r = parseInt(c.slice(1,3),16); g = parseInt(c.slice(3,5),16); b = parseInt(c.slice(5,7),16); }
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return c;
}

export { GRID_FUNC, GRID_OPTIONS };