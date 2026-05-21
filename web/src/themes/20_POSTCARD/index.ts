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
import { drawIcon, drawIsoIcon } from '../../core/drawing/canvas-icons';
import { FONT_LABELS, resolveFontFamily } from '../_shared/fonts';

/**
 * Postcard theme — classic postcard composition.
 *
 *  ┌─────────────────────────────┐
 *  │                             │
 *  │   Seoul, Korea              │   ← 상단 정보 블록
 *  │   2026   © artist           │
 *  │   ─────                     │
 *  │                             │
 *  │   ┌─────────────────────┐   │
 *  │   │                     │   │
 *  │   │       Photo         │   │   ← 사진 (가운데)
 *  │   │                     │   │
 *  │   └─────────────────────┘   │
 *  │                             │
 *  │   FUJIFILM X-T3             │   ← 하단 카메라 정보
 *  │   XF18-55mm                 │
 *  │   ─────────────────────     │
 *  │   [📐] [⊙] [⏱] [ISO]        │
 *  │   45mm f/11 1/60s 100       │
 *  └─────────────────────────────┘
 *
 * Gallery Card에서 옵션 시스템·색상·아이콘 처리를 재사용하되,
 * 정보를 사진의 좌우가 아닌 상하로 배치한 점이 핵심 차이.
 */

const POSTCARD_OPTIONS: ThemeOption[] = [
  // ── 외형 ──
  { id: 'DARK_MODE', type: 'boolean', default: false, label: '다크 모드', group: '외형' },

  // ── 상단 정보 (장소 / 년도 / 아티스트) ──
  { id: 'LOCATION', type: 'string', default: 'Seoul, Korea', label: '장소', group: '상단 정보', description: '\\n 줄바꿈 가능' },
  { id: 'LOCATION_FONT', type: 'select', default: '나눔명조 (한글용)', options: FONT_LABELS, label: '장소 폰트', group: '상단 정보', row: 'location-font' },
  { id: 'LOCATION_FONT_SIZE', type: 'number', default: 82, label: '장소 폰트 크기', group: '상단 정보', description: 'px', row: 'location-font' },
  { id: 'LOCATION_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 700, label: '장소 폰트 굵기', group: '상단 정보' },
  { id: 'YEAR_OVERRIDE', type: 'string', default: '', label: '년도 (수동)', group: '상단 정보', description: 'EXIF 년도 덮어쓰기' },
  { id: 'YEAR_FONT', type: 'select', default: FONT_LABELS[0], options: FONT_LABELS, label: '년도 폰트', group: '상단 정보', row: 'year-font' },
  { id: 'YEAR_FONT_SIZE', type: 'number', default: 54, label: '년도 폰트 크기', group: '상단 정보', description: 'px', row: 'year-font' },
  { id: 'YEAR_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 400, label: '년도 폰트 굵기', group: '상단 정보' },
  { id: 'ARTIST', type: 'string', default: '', label: '아티스트', group: '상단 정보' },
  { id: 'ARTIST_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 400, label: '아티스트 굵기', group: '상단 정보' },
  { id: 'TOP_CLUSTER_GAP', type: 'number', default: 8, label: '항목 간 간격', group: '상단 정보', description: 'px' },

  // ── 하단 정보 (카메라 / 렌즈 / EXIF) ──
  { id: 'SHOW_ICONS',            type: 'boolean',      default: true, label: 'EXIF 아이콘',   group: '하단 정보' },
  { id: 'EXIF_GAP',              type: 'number',       default: 30,   label: 'EXIF 값 간격',  group: '하단 정보', description: 'px — 조리개·셔터·ISO 사이' },
  { id: 'PRIMARY_FONT_WEIGHT',   type: 'range-slider', min: 400, max: 900, step: 100, default: 700, label: '카메라명 굵기',   group: '하단 정보' },
  { id: 'SECONDARY_FONT_WEIGHT', type: 'range-slider', min: 100, max: 600, step: 100, default: 400, label: '렌즈/EXIF 굵기', group: '하단 정보' },
  { id: 'DIVIDER_WEIGHT',        type: 'range-slider', min: 0.5, max: 6, step: 0.5, default: 2, label: '구분선 두께',  group: '하단 정보', description: '아이콘에는 영향 없음' },

  // ── 레이아웃 ──
  { id: 'CARD_MARGIN',         type: 'number', default: 40,  label: '카드 외곽 여백',    group: '레이아웃', description: 'px — 벽 ↔ 카드' },
  { id: 'CARD_PADDING_X',      type: 'number', default: 100, label: '카드 좌우 패딩',    group: '레이아웃', description: 'px' },
  { id: 'TOP_BLOCK_HEIGHT',    type: 'number', default: 200, label: '상단 블록 높이',    group: '레이아웃', description: 'px' },
  { id: 'BOTTOM_BLOCK_HEIGHT', type: 'number', default: 200, label: '하단 블록 높이',    group: '레이아웃', description: 'px' },
  { id: 'PHOTO_TOP_GAP',       type: 'number', default: 80,  label: '상단 ↔ 사진 간격',  group: '레이아웃', description: 'px' },
  { id: 'PHOTO_BOTTOM_GAP',    type: 'number', default: 80,  label: '사진 ↔ 하단 간격',  group: '레이아웃', description: 'px' },
];

const POSTCARD_FUNC: ThemeFunc = (photo: Photo, input: ThemeOptionInput, store: Store) => {
  const DARK_MODE = input.get('DARK_MODE') as boolean;

  const LOCATION_RAW = input.get('LOCATION') as string;
  const LOCATION_FONT_LABEL = input.get('LOCATION_FONT') as string;
  const LOCATION_FONT_SIZE = input.get('LOCATION_FONT_SIZE') as number;
  const YEAR_OVERRIDE = (input.get('YEAR_OVERRIDE') as string).trim();
  const YEAR_FONT_LABEL = input.get('YEAR_FONT') as string;
  const YEAR_FONT_SIZE = input.get('YEAR_FONT_SIZE') as number;
  const ARTIST = (input.get('ARTIST') as string).trim();
  const TOP_CLUSTER_GAP = input.get('TOP_CLUSTER_GAP') as number;

  const CARD_MARGIN = input.get('CARD_MARGIN') as number;
  const CARD_PADDING_X = input.get('CARD_PADDING_X') as number;
  const TOP_BLOCK_HEIGHT = input.get('TOP_BLOCK_HEIGHT') as number;
  const BOTTOM_BLOCK_HEIGHT = input.get('BOTTOM_BLOCK_HEIGHT') as number;
  const PHOTO_TOP_GAP = input.get('PHOTO_TOP_GAP') as number;
  const PHOTO_BOTTOM_GAP = input.get('PHOTO_BOTTOM_GAP') as number;

  const PRIMARY_FONT_WEIGHT = input.get('PRIMARY_FONT_WEIGHT') as number;
  const SECONDARY_FONT_WEIGHT = input.get('SECONDARY_FONT_WEIGHT') as number;
  const LOCATION_FONT_WEIGHT = input.get('LOCATION_FONT_WEIGHT') as number;
  const YEAR_FONT_WEIGHT = input.get('YEAR_FONT_WEIGHT') as number;
  const ARTIST_FONT_WEIGHT = input.get('ARTIST_FONT_WEIGHT') as number;
  const SHOW_ICONS = input.get('SHOW_ICONS') as boolean;
  const EXIF_GAP = input.get('EXIF_GAP') as number;
  const DIVIDER_WEIGHT = input.get('DIVIDER_WEIGHT') as number;

  const locationFontFamily = resolveFontFamily(LOCATION_FONT_LABEL);
  const yearFontFamily     = resolveFontFamily(YEAR_FONT_LABEL);
  const baseFontFamily     = resolveFontFamily(FONT_LABELS[0]);

  // Colors — 다크모드는 카드 배경/텍스트 모두 다크 톤
  const WALL_COLOR     = DARK_MODE ? '#0a0a0a' : '#f5f5f5';
  const CARD_COLOR     = DARK_MODE ? '#1a1a1a' : '#ffffff';
  const PRIMARY_TEXT   = DARK_MODE ? '#f0ece4' : '#1a1a1a';
  const SECONDARY_TEXT = DARK_MODE ? '#999999' : '#666666';
  const HAIRLINE       = DARK_MODE ? '#444444' : '#cccccc';

  // 사진의 위·아래에 정보 블록이 들어가므로 padding 자체는 비대칭
  const TOP_PAD    = CARD_MARGIN + TOP_BLOCK_HEIGHT + PHOTO_TOP_GAP;
  const BOTTOM_PAD = CARD_MARGIN + BOTTOM_BLOCK_HEIGHT + PHOTO_BOTTOM_GAP;
  const LEFT_PAD   = CARD_MARGIN + CARD_PADDING_X;
  const RIGHT_PAD  = CARD_MARGIN + CARD_PADDING_X;

  const canvas = sandbox(photo, {
    targetRatio: store.ratio,
    notCroppedMode: store.notCroppedMode,
    backgroundColor: WALL_COLOR,
    padding: { top: TOP_PAD, right: RIGHT_PAD, bottom: BOTTOM_PAD, left: LEFT_PAD },
  });

  const ctx = canvas.getContext('2d')!;

  // Card rectangle behind everything
  const cardX = CARD_MARGIN;
  const cardY = CARD_MARGIN;
  const cardW = canvas.width - CARD_MARGIN * 2;
  const cardH = canvas.height - CARD_MARGIN * 2;
  const cardRadius = 14;

  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  fillRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius, CARD_COLOR);
  ctx.restore();

  // Layout coordinates
  const contentLeft  = LEFT_PAD;
  const contentRight = canvas.width - RIGHT_PAD;
  const contentWidth = contentRight - contentLeft;

  const topBlockY    = CARD_MARGIN + 60;   // 카드 상단으로부터 약간 여백
  const bottomBlockY = canvas.height - CARD_MARGIN - BOTTOM_BLOCK_HEIGHT;

  // ===== TOP BLOCK =====
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Location
  ctx.fillStyle = PRIMARY_TEXT;
  ctx.font = `${LOCATION_FONT_WEIGHT} ${LOCATION_FONT_SIZE}px ${locationFontFamily}`;
  const locationLines = normalizeLineBreaks(LOCATION_RAW).split('\n');
  let topCursorY = topBlockY + LOCATION_FONT_SIZE;
  for (let i = 0; i < locationLines.length; i++) {
    ctx.fillText(locationLines[i].trim(), contentLeft, topCursorY);
    if (i < locationLines.length - 1) {
      topCursorY += LOCATION_FONT_SIZE * 1.1;
    }
  }

  // Year + Artist on the same baseline
  const year = YEAR_OVERRIDE || extractYear(photo.takenAt) || '';
  if (year || ARTIST) {
    topCursorY += TOP_CLUSTER_GAP + YEAR_FONT_SIZE;
    if (year) {
      ctx.fillStyle = SECONDARY_TEXT;
      ctx.font = `${YEAR_FONT_WEIGHT} ${YEAR_FONT_SIZE}px ${yearFontFamily}`;
      ctx.fillText(year, contentLeft, topCursorY);
    }
    if (ARTIST) {
      ctx.fillStyle = SECONDARY_TEXT;
      ctx.font = `${ARTIST_FONT_WEIGHT} ${YEAR_FONT_SIZE}px ${baseFontFamily}`;
      ctx.textAlign = 'right';
      ctx.fillText(`© ${ARTIST}`, contentRight, topCursorY);
      ctx.textAlign = 'left';
    }
  }

  // Hairline under top block (양 끝)
  topCursorY += TOP_CLUSTER_GAP + 20;
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = DIVIDER_WEIGHT;
  ctx.beginPath();
  ctx.moveTo(contentLeft, topCursorY);
  ctx.lineTo(contentRight, topCursorY);
  ctx.stroke();

  // ===== BOTTOM BLOCK =====
  // 사진 폭 전체를 사용. 좌측 끝에 카메라/렌즈, 우측 끝에 EXIF.
  const bottomLeft   = contentLeft;
  const bottomRight  = contentRight;
  const bottomBlockW = contentWidth;

  // 비례 단위 — BOTTOM_BLOCK_HEIGHT가 곧 hairline-to-hairline 높이.
  const scale = BOTTOM_BLOCK_HEIGHT;
  const cameraNameSize    = scale * 0.33;
  const lensSize          = scale * 0.20;
  const cameraToLensGap   = scale * 0.10;
  const exifGap           = EXIF_GAP;  // 사용자 지정 — EXIF 항목 사이 가로 간격
  const lensToHairlineGap = scale * 0.17;

  // 카메라/EXIF 영역 위에도 hairline (블록 시작 구분)
  const topHairY = bottomBlockY - cameraNameSize * 0.4;
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = DIVIDER_WEIGHT;
  ctx.beginPath();
  ctx.moveTo(bottomLeft, topHairY);
  ctx.lineTo(bottomRight, topHairY);
  ctx.stroke();

  // 좌측 영역: 카메라명 + 렌즈명 (2줄)
  const leftStartY = bottomBlockY + cameraNameSize;
  ctx.fillStyle = PRIMARY_TEXT;
  ctx.font = `${PRIMARY_FONT_WEIGHT} ${cameraNameSize}px ${baseFontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const cameraName = [photo.make, photo.model].filter(Boolean).join(' ').trim();
  // 좌측 영역 폭: 사진 폭의 약 55% (우측에 EXIF 들어갈 공간 확보)
  const leftAreaW = bottomBlockW * 0.55;
  ctx.fillText(truncateText(ctx, cameraName, leftAreaW), bottomLeft, leftStartY);

  if (photo.lensModel) {
    ctx.fillStyle = SECONDARY_TEXT;
    ctx.font = `${SECONDARY_FONT_WEIGHT} ${lensSize}px ${baseFontFamily}`;
    ctx.fillText(
      truncateText(ctx, photo.lensModel, leftAreaW),
      bottomLeft,
      leftStartY + cameraToLensGap + lensSize,
    );
  }

  // 우측 영역: EXIF — 카메라/렌즈와 같은 수직 영역에 배치
  const exifParts = !store.disableExposureMeter
    ? [
        photo.focalLength,
        photo.fNumber,
        photo.exposureTime,
        photo.iso,
      ].filter(Boolean) as string[]
    : [];

  if (exifParts.length > 0) {
    // 두 덩어리(카메라+렌즈 vs EXIF) 시각 균형:
    // 좌측은 2줄(0.33 + 0.20)로 시각 가중치 큰 편, 우측은 1줄이므로
    // 카메라명 크기 수준(0.30)으로 키워야 비슷한 무게가 됨. 아이콘도 동일.
    const valueFontSize = scale * 0.30;
    const iconSize      = scale * 0.30;
    // 수치들이 가로로 나열, 우측 끝(bottomRight)에 정렬.
    // 수직 중심은 카메라명과 렌즈명의 정확한 가운데.
    const lensBottomY = leftStartY + cameraToLensGap + lensSize;
    const exifCenterY = (leftStartY - cameraNameSize * 0.7 + lensBottomY) / 2;

    ctx.font = `500 ${valueFontSize}px ${baseFontFamily}`;
    ctx.textBaseline = 'middle';

    // 각 항목 폭 계산 (아이콘 ON일 때는 아이콘+간격+값)
    const iconValueGap = valueFontSize * 0.35;
    const items = exifParts.map((v, idx) => {
      const valW = ctx.measureText(v).width;
      const totalItemW = SHOW_ICONS ? iconSize + iconValueGap + valW : valW;
      return { value: v, valW, totalItemW, icon: pickIcon(idx, exifParts.length) };
    });
    const totalExifW =
      items.reduce((s, it) => s + it.totalItemW, 0) + exifGap * (items.length - 1);

    let xCur = bottomRight - totalExifW;
    for (const it of items) {
      if (SHOW_ICONS) {
        if (it.icon === 'iso') {
          drawIsoIcon(ctx, xCur + iconSize / 2, exifCenterY, iconSize, PRIMARY_TEXT, 2.5);
        } else {
          drawIcon(ctx, it.icon, {
            cx: xCur + iconSize / 2, cy: exifCenterY, size: iconSize,
            color: PRIMARY_TEXT, strokeWidth: 2.5,
          });
        }
        xCur += iconSize + iconValueGap;
      }
      ctx.fillStyle = PRIMARY_TEXT;
      ctx.textAlign = 'left';
      ctx.fillText(it.value, xCur, exifCenterY);
      xCur += it.valW + exifGap;
    }
    ctx.textBaseline = 'alphabetic';
  }

  // 카메라/렌즈/EXIF 줄 아래 hairline (전체 블록 폭)
  const lensBottomY = leftStartY + cameraToLensGap + lensSize;
  const hairY = lensBottomY + lensToHairlineGap;
  ctx.strokeStyle = HAIRLINE;
  ctx.lineWidth = DIVIDER_WEIGHT;
  ctx.beginPath();
  ctx.moveTo(bottomLeft, hairY);
  ctx.lineTo(bottomRight, hairY);
  ctx.stroke();

  return canvas;
};

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

type IconName = 'ruler' | 'aperture' | 'clock' | 'iso';
function pickIcon(idx: number, total: number): IconName {
  if (total === 4) return (['ruler', 'aperture', 'clock', 'iso'] as IconName[])[idx];
  return (['ruler', 'aperture', 'clock', 'iso'] as IconName[])[idx % 4];
}

function extractYear(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? match[1] : null;
}

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

export { POSTCARD_FUNC, POSTCARD_OPTIONS };