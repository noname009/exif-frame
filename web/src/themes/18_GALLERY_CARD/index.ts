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
import { drawIcon, drawIsoIcon } from '../../core/drawing/canvas-icons';

/**
 * Gallery Card theme — print/gallery style.
 *
 * Right column composition (top → bottom):
 *
 *   ┌──────────────────────────┐
 *   │  Seoul, Korea            │   ← LOCATION (multi-line, \n support)
 *   │  2026                    │   ← YEAR     (font size adjustable)
 *   │  © artist                │   ← ARTIST   (optional)
 *   │  ─                       │
 *   │                          │
 *   │  [ magazine caption     ]│   ← CAPTION  (multi-line, font adjustable)
 *   │  [ multi-line text area ]│
 *   │                          │
 *   │  CAMERA MODEL            │   ← bottom cluster
 *   │  Lens                    │
 *   │  ─                       │
 *   │  [📐] [⊙] [⏱] [ISO]      │
 *   │  45mm  f/11  1/60s  100  │
 *   └──────────────────────────┘
 */

const GALLERY_CARD_OPTIONS: ThemeOption[] = [
  // ── 외형 ──
  { id: 'DARK_MODE', type: 'boolean', default: false, label: '다크 모드', group: '외형', description: '갤러리 벽 다크 배경' },

  // ── 상단 정보 (장소 / 년도 / 아티스트) ──
  { id: 'LOCATION', type: 'string', default: 'Seoul, Korea', label: '장소', group: '상단 정보', description: '\\n 줄바꿈 가능' },
  { id: 'LOCATION_FONT', type: 'select', default: '나눔명조 (한글용)', options: FONT_LABELS, label: '장소 폰트', group: '상단 정보' },
  { id: 'LOCATION_FONT_SIZE', type: 'number', default: 88, label: '장소 폰트 크기', group: '상단 정보', description: 'px' },
  { id: 'LOCATION_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 700, label: '장소 폰트 굵기', group: '상단 정보' },
  { id: 'YEAR_OVERRIDE', type: 'string', default: '', label: '년도 (수동)', group: '상단 정보', description: 'EXIF 년도 덮어쓰기' },
  { id: 'YEAR_FONT', type: 'select', default: FONT_LABELS[0], options: FONT_LABELS, label: '년도 폰트', group: '상단 정보' },
  { id: 'YEAR_FONT_SIZE', type: 'number', default: 77, label: '년도 폰트 크기', group: '상단 정보', description: 'px' },
  { id: 'YEAR_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 400, label: '년도 폰트 굵기', group: '상단 정보' },
  { id: 'ARTIST', type: 'string', default: '', label: '아티스트', group: '상단 정보' },
  { id: 'ARTIST_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 400, label: '아티스트 굵기', group: '상단 정보' },
  { id: 'TOP_CLUSTER_GAP', type: 'number', default: 8, label: '항목 간 간격', group: '상단 정보', description: 'px' },

  // ── 캡션 (매거진 스타일 본문) ──
  { id: 'CAPTION', type: 'string', default: '', label: '캡션', group: '캡션', description: '본문 텍스트. \\n 줄바꿈' },
  { id: 'CAPTION_FONT', type: 'select', default: FONT_LABELS[0], options: FONT_LABELS, label: '캡션 폰트', group: '캡션' },
  { id: 'CAPTION_FONT_SIZE', type: 'number', default: 32, label: '캡션 폰트 크기', group: '캡션', description: 'px' },
  { id: 'CAPTION_LINE_HEIGHT', type: 'range-slider', min: 1, max: 2, step: 0.05, default: 1.5, label: '캡션 줄 간격', group: '캡션' },

  // ── 하단 정보 (카메라 / 렌즈 / EXIF) ──
  { id: 'SHOW_ICONS',            type: 'boolean',      default: true, label: 'EXIF 아이콘', group: '하단 정보' },
  { id: 'PRIMARY_FONT_WEIGHT',   type: 'range-slider', min: 400, max: 900, step: 100, default: 700, label: '카메라명 굵기',   group: '하단 정보' },
  { id: 'SECONDARY_FONT_WEIGHT', type: 'range-slider', min: 100, max: 600, step: 100, default: 400, label: '렌즈/EXIF 굵기', group: '하단 정보' },
  { id: 'DIVIDER_WEIGHT',        type: 'range-slider', min: 0.5, max: 6, step: 0.5, default: 2, label: '구분선 두께', group: '하단 정보', description: '아이콘에는 영향 없음' },

  // ── 레이아웃 ──
  { id: 'WALL_MARGIN',       type: 'number', default: 90,  label: '벽 여백',          group: '레이아웃', description: 'px — 사진과 벽 사이' },
  { id: 'CARD_PADDING',      type: 'number', default: 80,  label: '카드 내부 패딩',   group: '레이아웃', description: 'px' },
  { id: 'INFO_COLUMN_WIDTH', type: 'number', default: 700, label: '우측 정보 컬럼 폭', group: '레이아웃', description: 'px' },
];

const GALLERY_CARD_FUNC: ThemeFunc = (photo: Photo, input: ThemeOptionInput, store: Store) => {
  const DARK_MODE = input.get('DARK_MODE') as boolean;
  const LOCATION_RAW = (input.get('LOCATION') as string);
  const LOCATION_FONT_LABEL = input.get('LOCATION_FONT') as string;
  const LOCATION_FONT_SIZE = input.get('LOCATION_FONT_SIZE') as number;
  const YEAR_OVERRIDE = (input.get('YEAR_OVERRIDE') as string).trim();
  const YEAR_FONT_LABEL = input.get('YEAR_FONT') as string;
  const YEAR_FONT_SIZE = input.get('YEAR_FONT_SIZE') as number;
  const ARTIST = (input.get('ARTIST') as string).trim();
  const TOP_CLUSTER_GAP = input.get('TOP_CLUSTER_GAP') as number;
  const CAPTION_RAW = input.get('CAPTION') as string;
  const CAPTION_FONT_LABEL = input.get('CAPTION_FONT') as string;
  const CAPTION_FONT_SIZE = input.get('CAPTION_FONT_SIZE') as number;
  const CAPTION_LINE_HEIGHT = input.get('CAPTION_LINE_HEIGHT') as number;
  const WALL_MARGIN = input.get('WALL_MARGIN') as number;
  const CARD_PADDING = input.get('CARD_PADDING') as number;
  const INFO_COLUMN_WIDTH = input.get('INFO_COLUMN_WIDTH') as number;
  const PRIMARY_FONT_WEIGHT = input.get('PRIMARY_FONT_WEIGHT') as number;
  const SECONDARY_FONT_WEIGHT = input.get('SECONDARY_FONT_WEIGHT') as number;
  const LOCATION_FONT_WEIGHT = input.get('LOCATION_FONT_WEIGHT') as number;
  const YEAR_FONT_WEIGHT = input.get('YEAR_FONT_WEIGHT') as number;
  const ARTIST_FONT_WEIGHT = input.get('ARTIST_FONT_WEIGHT') as number;
  const SHOW_ICONS = input.get('SHOW_ICONS') as boolean;
  const DIVIDER_WEIGHT = input.get('DIVIDER_WEIGHT') as number;

  // Font families per text block — 각 영역마다 따로 선택 가능
  const locationFontFamily = resolveFontFamily(LOCATION_FONT_LABEL);
  const yearFontFamily     = resolveFontFamily(YEAR_FONT_LABEL);
  const captionFontFamily  = resolveFontFamily(CAPTION_FONT_LABEL);
  const baseFontFamily     = resolveFontFamily(FONT_LABELS[0]); // 카메라/렌즈/EXIF는 항상 기본 Barlow

  // Colors — 다크모드는 카드 배경/텍스트 모두 다크 톤
  const WALL_COLOR     = DARK_MODE ? '#0a0a0a' : '#f5f5f5';
  const CARD_COLOR     = DARK_MODE ? '#1a1a1a' : '#ffffff';
  const PRIMARY_TEXT   = DARK_MODE ? '#f0ece4' : '#1a1a1a';
  const SECONDARY_TEXT = DARK_MODE ? '#999999' : '#666666';
  const HAIRLINE       = DARK_MODE ? '#444444' : '#cccccc';

  const TOP_PAD    = WALL_MARGIN + CARD_PADDING;
  const BOTTOM_PAD = WALL_MARGIN + CARD_PADDING;
  const LEFT_PAD   = WALL_MARGIN + CARD_PADDING;
  const RIGHT_PAD  = WALL_MARGIN + CARD_PADDING + INFO_COLUMN_WIDTH;

  const canvas = sandbox(photo, {
    targetRatio: store.ratio,
    notCroppedMode: store.notCroppedMode,
    backgroundColor: WALL_COLOR,
    padding: { top: TOP_PAD, right: RIGHT_PAD, bottom: BOTTOM_PAD, left: LEFT_PAD },
  });

  const ctx = canvas.getContext('2d')!;

  // Card rectangle behind the photo
  const cardX = WALL_MARGIN;
  const cardY = WALL_MARGIN;
  const cardW = canvas.width - WALL_MARGIN * 2;
  const cardH = canvas.height - WALL_MARGIN * 2;
  const cardRadius = 14;

  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  fillRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius, CARD_COLOR);
  ctx.restore();

  const photoX = LEFT_PAD;
  const photoY = TOP_PAD;
  const photoW = canvas.width - LEFT_PAD - RIGHT_PAD;
  const photoH = canvas.height - TOP_PAD - BOTTOM_PAD;

  const infoX        = photoX + photoW + CARD_PADDING;
  const infoTopY     = photoY;
  const infoBottomY  = photoY + photoH;
  // 오른쪽 여백 축소: 기존 CARD_PADDING + 50 → CARD_PADDING * 0.4
  const infoRightX   = infoX + INFO_COLUMN_WIDTH - Math.round(CARD_PADDING * 0.4);
  const infoTextWidth = infoRightX - infoX;

  // ===== TOP CLUSTER =====
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Location — \n 줄바꿈 지원
  ctx.fillStyle = PRIMARY_TEXT;
  ctx.font = `${LOCATION_FONT_WEIGHT} ${LOCATION_FONT_SIZE}px ${locationFontFamily}`;
  const locationLines = normalizeLineBreaks(LOCATION_RAW).split('\n').filter(l => l.trim() !== '' || true);
  let cursorY = infoTopY + LOCATION_FONT_SIZE + 10;
  for (let i = 0; i < locationLines.length; i++) {
    ctx.fillText(locationLines[i].trim(), infoX, cursorY);
    if (i < locationLines.length - 1) {
      cursorY += LOCATION_FONT_SIZE * 1.1;
    }
  }
  // cursorY is now at the baseline of the last location line

  // Year (sits below location cluster) — 간격은 TOP_CLUSTER_GAP 으로 제어
  const year = YEAR_OVERRIDE || extractYear(photo.takenAt) || '';
  if (year) {
    ctx.fillStyle = SECONDARY_TEXT;
    ctx.font = `${YEAR_FONT_WEIGHT} ${YEAR_FONT_SIZE}px ${yearFontFamily}`;
    cursorY += TOP_CLUSTER_GAP + YEAR_FONT_SIZE;
    ctx.fillText(year, infoX, cursorY);
  }

  // Artist — 기본 폰트 (Barlow) 고정. 간격은 TOP_CLUSTER_GAP 으로 제어
  const ARTIST_FONT_SIZE = 38;
  if (ARTIST) {
    ctx.fillStyle = SECONDARY_TEXT;
    ctx.font = `${ARTIST_FONT_WEIGHT} ${ARTIST_FONT_SIZE}px ${baseFontFamily}`;
    cursorY += TOP_CLUSTER_GAP + ARTIST_FONT_SIZE;
    ctx.fillText(`© ${ARTIST}`, infoX, cursorY);
  }

  // Hairline under title cluster
  cursorY += TOP_CLUSTER_GAP + 18;
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = DIVIDER_WEIGHT;
  ctx.beginPath();
  ctx.moveTo(infoX, cursorY);
  ctx.lineTo(infoX + 90, cursorY);
  ctx.stroke();

  // ===== BOTTOM CLUSTER (camera, lens, icons + values) =====
  const exifParts = !store.disableExposureMeter
    ? [
        photo.focalLength,
        photo.fNumber,
        photo.exposureTime,
        photo.iso,
      ].filter(Boolean) as string[]
    : [];

  // All bottom-cluster sizes scale with infoTextWidth (= infoRightX - infoX)
  // 기존 colScale = INFO_COLUMN_WIDTH 에서 infoTextWidth로 변경 → 여백 축소분만큼 아이콘/텍스트 커짐
  const colScale = infoTextWidth;
  const cameraNameSize  = colScale * 0.083;
  const lensSize        = colScale * 0.054;
  const iconSize        = colScale * 0.088;  // 기존 0.080 → 0.088 (비율 확대)
  const valueFontSize   = colScale * 0.058;  // 기존 0.051 → 0.058
  const iconValueGap    = colScale * 0.026;
  const cameraToLensGap = colScale * 0.010;
  const lensToHairlineGap = colScale * 0.043;
  const hairlineToIconGap = colScale * 0.037;

  const hasIcons = SHOW_ICONS && exifParts.length > 0;
  const exifRowHeight = hasIcons ? iconSize + iconValueGap + valueFontSize : valueFontSize;
  const bottomBlockHeight =
    cameraNameSize + cameraToLensGap + lensSize + lensToHairlineGap +
    hairlineToIconGap + exifRowHeight + colScale * 0.043;

  const cameraY = infoBottomY - bottomBlockHeight + cameraNameSize;

  // Camera maker + model — 기본 폰트 고정
  ctx.fillStyle = PRIMARY_TEXT;
  ctx.font = `${PRIMARY_FONT_WEIGHT} ${cameraNameSize}px ${baseFontFamily}`;
  const cameraName = [photo.make, photo.model].filter(Boolean).join(' ').trim();
  ctx.fillText(truncateText(ctx, cameraName, infoTextWidth), infoX, cameraY);

  if (photo.lensModel) {
    ctx.fillStyle = SECONDARY_TEXT;
    ctx.font = `${SECONDARY_FONT_WEIGHT} ${lensSize}px ${baseFontFamily}`;
    ctx.fillText(truncateText(ctx, photo.lensModel, infoTextWidth), infoX, cameraY + lensSize + cameraToLensGap);
  }

  // Hairline between lens text and EXIF icons
  const hairlineY = cameraY + lensSize + lensToHairlineGap + cameraToLensGap;
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = DIVIDER_WEIGHT;
  ctx.beginPath();
  ctx.moveTo(infoX, hairlineY);
  ctx.lineTo(infoRightX, hairlineY);
  ctx.stroke();

  // EXIF row with proportional icon-value spacing + dividers between columns
  if (exifParts.length > 0) {
    const colCount = exifParts.length;
    const colWidth = infoTextWidth / colCount;
    const iconRowCy = hairlineY + hairlineToIconGap + iconSize / 2;
    const valueRowY = iconRowCy + iconSize / 2 + iconValueGap;

    exifParts.forEach((value, idx) => {
      const colCenterX = infoX + colWidth * idx + colWidth / 2;

      // Vertical divider between columns (skip first)
      if (idx > 0) {
        const divX = infoX + colWidth * idx;
        ctx.strokeStyle = HAIRLINE;
        ctx.lineWidth = DIVIDER_WEIGHT;
        ctx.beginPath();
        ctx.moveTo(divX, hairlineY + hairlineToIconGap * 0.3);
        ctx.lineTo(divX, valueRowY + valueFontSize);
        ctx.stroke();
      }

      if (hasIcons) {
        const iconName = pickIcon(idx, colCount);
        // 아이콘은 DIVIDER_WEIGHT와 무관하게 고정 stroke (2.5)
        if (iconName === 'iso') {
          drawIsoIcon(ctx, colCenterX, iconRowCy, iconSize, PRIMARY_TEXT, 2.5);
        } else {
          drawIcon(ctx, iconName, {
            cx: colCenterX,
            cy: iconRowCy,
            size: iconSize,
            color: PRIMARY_TEXT,
            strokeWidth: 2.5,
          });
        }
      }

      ctx.fillStyle = PRIMARY_TEXT;
      ctx.font = `500 ${valueFontSize}px ${baseFontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(value, colCenterX, valueRowY + valueFontSize * 0.85);
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // ===== MIDDLE: magazine caption =====
  if (CAPTION_RAW && CAPTION_RAW.trim()) {
    const captionTop = cursorY + 60;
    const captionBottom = infoBottomY - bottomBlockHeight - 40;
    const captionAvailH = captionBottom - captionTop;

    if (captionAvailH > CAPTION_FONT_SIZE * 1.5) {
      drawWrappedText(ctx, CAPTION_RAW, {
        x: infoX,
        y: captionTop,
        maxWidth: infoTextWidth,
        maxHeight: captionAvailH,
        fontSize: CAPTION_FONT_SIZE,
        fontWeight: SECONDARY_FONT_WEIGHT,
        color: PRIMARY_TEXT,
        lineHeight: CAPTION_LINE_HEIGHT,
        fontFamily: captionFontFamily,
      });
    }
  }

  return canvas;
};

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

type IconName = 'ruler' | 'aperture' | 'clock' | 'iso' | 'lens' | 'exposure' | 'camera' | 'film';
function pickIcon(idx: number, total: number): IconName {
  if (total === 4) {
    return (['ruler', 'aperture', 'clock', 'iso'] as IconName[])[idx] || 'camera';
  }
  return (['ruler', 'aperture', 'clock', 'iso'] as IconName[])[idx % 4];
}

function extractYear(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? match[1] : null;
}

/** \n 과 \\n 를 모두 실제 줄바꿈으로 정규화 */
function normalizeLineBreaks(s: string): string {
  return s.replace(/\\n/g, '\n');
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 0 && ctx.measureText(s + '…').width > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + '…';
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: {
    x: number;
    y: number;
    maxWidth: number;
    maxHeight: number;
    fontSize: number;
    fontWeight: number;
    color: string;
    lineHeight: number;
    fontFamily: string;
  }
): void {
  const { x, y, maxWidth, maxHeight, fontSize, fontWeight, color, lineHeight, fontFamily } = opts;

  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const lineSpacing = fontSize * lineHeight;
  const normalized = normalizeLineBreaks(text);
  const paragraphs = normalized.split('\n');

  const wrappedLines: string[] = [];
  for (const para of paragraphs) {
    if (para.length === 0) {
      wrappedLines.push('');
      continue;
    }
    const words = para.split(' ');
    let current = '';
    for (const word of words) {
      const candidate = current.length === 0 ? word : `${current} ${word}`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) wrappedLines.push(current);
        current = word;
      }
    }
    if (current) wrappedLines.push(current);
  }

  const maxLines = Math.max(1, Math.floor(maxHeight / lineSpacing));
  const linesToDraw = wrappedLines.slice(0, maxLines);

  if (wrappedLines.length > maxLines && linesToDraw.length > 0) {
    const lastIdx = linesToDraw.length - 1;
    let lastLine = linesToDraw[lastIdx];
    while (lastLine.length > 0 && ctx.measureText(lastLine + '…').width > maxWidth) {
      lastLine = lastLine.slice(0, -1);
    }
    linesToDraw[lastIdx] = lastLine + '…';
  }

  linesToDraw.forEach((line, idx) => {
    ctx.fillText(line, x, y + fontSize + idx * lineSpacing);
  });

  ctx.restore();
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  fill: string
): void {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  const anyCtx = ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void };
  if (typeof anyCtx.roundRect === 'function') {
    anyCtx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export { GALLERY_CARD_FUNC, GALLERY_CARD_OPTIONS };