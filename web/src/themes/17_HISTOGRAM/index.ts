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
import { computeHistogram, drawHistogram, HistogramStyle, HistogramChannels } from '../../core/drawing/histogram';
import { resolveBrandLogo, drawBrandLogo } from '../../core/drawing/brand-logo';
import { FONT_LABELS, resolveFontFamily } from '../_shared/fonts';

/**
 * Histogram theme — unified fluid layout edition.
 *
 * One layout for all aspect ratios: logo + info on the left, histogram
 * on the right. The strap height grows or shrinks based on how many
 * info rows are present, and the histogram height follows the strap
 * so its visual weight always matches the info block.
 *
 * Row composition:
 *   Row 1 (always):  Maker · Model
 *   Row 2 (always):  Lens (or placeholder if missing)
 *   Row 3 (optional): Date OR Artist — only if SHOW_DATE/SHOW_ARTIST yields content
 *   Row 4 (always):  ISO · Focal · Aperture · Shutter
 *
 * So the strap is 3 rows when no date/artist, 4 rows when present.
 * Both heights are computed from the same row unit, so vertical rhythm
 * stays consistent.
 */

// Layout constants (in canvas pixels)
const ROW_HEIGHT = 90;        // vertical space per info row
const STRAP_PADDING_Y = 70;   // top + bottom padding inside the strap
const SIDE_PADDING = 70;      // horizontal padding from canvas edges
const LOGO_GUTTER = 56;       // space between logo and text column
const HIST_GUTTER = 56;       // space between text column and histogram

const FRAME_TOP_DEFAULT = 80;
const FRAME_SIDE_DEFAULT = 80;

const HISTOGRAM_OPTIONS: ThemeOption[] = [
  // ── 외형 ──
  { id: 'DARK_MODE', type: 'boolean', default: false, label: '다크 모드', group: '외형' },
  { id: 'SHOW_LOGO', type: 'boolean', default: true, label: '브랜드 로고', group: '외형', description: '카메라 제조사 로고' },
  { id: 'SHOW_DIVIDER', type: 'boolean', default: true, label: '구분선', group: '외형', description: '로고와 정보 사이 수직선' },

  // ── 정보 ──
  { id: 'ARTIST', type: 'string', default: '', label: '아티스트', group: '정보', description: '입력 시 © 표시' },
  { id: 'ARTIST_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 400, label: '아티스트 굵기', group: '정보' },
  { id: 'SHOW_DATE', type: 'boolean', default: false, label: '날짜 표시', group: '정보', description: '아티스트가 있으면 자동 해제' },
  { id: 'DATE_OVERRIDE', type: 'string', default: '', label: '날짜 (수동)', group: '정보', description: 'EXIF에 날짜가 없을 때' },

  // ── 폰트 ──
  { id: 'PRIMARY_FONT', type: 'select', default: FONT_LABELS[0], options: FONT_LABELS, label: '주 텍스트 폰트', group: '폰트', description: '카메라/렌즈/노출값' },
  { id: 'SECONDARY_FONT', type: 'select', default: FONT_LABELS[0], options: FONT_LABELS, label: '보조 텍스트 폰트', group: '폰트', description: '렌즈/날짜' },
  { id: 'SECONDARY_TEXT_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 300, label: '보조 텍스트 굵기', group: '폰트' },

  // ── 레이아웃 ──
  { id: 'FRAME_TOP', type: 'number', default: FRAME_TOP_DEFAULT, label: '상단 여백', group: '레이아웃', description: 'px' },
  { id: 'FRAME_LEFT', type: 'number', default: FRAME_SIDE_DEFAULT, label: '좌측 여백', group: '레이아웃', description: 'px' },
  { id: 'FRAME_RIGHT', type: 'number', default: FRAME_SIDE_DEFAULT, label: '우측 여백', group: '레이아웃', description: 'px' },
  { id: 'FRAME_BOTTOM_EXTRA', type: 'number', default: 0, label: '하단 추가 여백', group: '레이아웃', description: 'px — 스트랩 아래' },

  // ── 히스토그램 ──
  {
    id: 'HISTOGRAM_STYLE',
    type: 'select',
    options: ['classic', 'minimal', 'bars', 'waveform', 'comic', 'neon', 'pastel', 'ridge'],
    default: 'pastel',
    label: '스타일',
    group: '히스토그램',
  },
  {
    id: 'HISTOGRAM_CHANNELS',
    type: 'select',
    options: ['rgb', 'luma', 'rgb+luma'],
    default: 'rgb',
    label: '채널',
    group: '히스토그램',
  },
  { id: 'HISTOGRAM_WIDTH_RATIO', type: 'range-slider', default: 0.34, min: 0.25, max: 0.6, step: 0.01, label: '너비 비율', group: '히스토그램', description: '스트랩 영역 대비' },
  { id: 'HISTOGRAM_OPACITY', type: 'range-slider', default: 0.55, min: 0.2, max: 1, step: 0.05, label: '투명도', group: '히스토그램' },
  { id: 'HISTOGRAM_SMOOTHING', type: 'range-slider', default: 0.9, min: 0, max: 1, step: 0.05, label: '스무딩', group: '히스토그램', description: '0 = 날카로움, 1 = 부드러움' },
  {
    id: 'HISTOGRAM_PRECISION',
    type: 'select',
    options: ['fast', 'precise'],
    default: 'fast',
    label: '정확도',
    group: '히스토그램',
    description: 'precise는 더 정확하지만 느림',
  },
  { id: 'SHOW_GRID', type: 'boolean', default: true, label: '그리드', group: '히스토그램' },
  { id: 'SHOW_CLIPPING', type: 'boolean', default: true, label: '클리핑 표시', group: '히스토그램' },
];

const HISTOGRAM_FUNC: ThemeFunc = (photo: Photo, input: ThemeOptionInput, store: Store) => {
  const DARK_MODE = input.get('DARK_MODE') as boolean;
  const ARTIST = (input.get('ARTIST') as string).trim();
  const SHOW_DATE = input.get('SHOW_DATE') as boolean;
  const DATE_OVERRIDE = (input.get('DATE_OVERRIDE') as string).trim();
  const SECONDARY_TEXT_FONT_WEIGHT = input.get('SECONDARY_TEXT_FONT_WEIGHT') as number;
  const ARTIST_FONT_WEIGHT = input.get('ARTIST_FONT_WEIGHT') as number;
  const SHOW_LOGO = input.get('SHOW_LOGO') as boolean;
  const PRIMARY_FONT_FAMILY = resolveFontFamily(input.get('PRIMARY_FONT') as string);
  const SECONDARY_FONT_FAMILY = resolveFontFamily(input.get('SECONDARY_FONT') as string);
  const SHOW_DIVIDER = input.get('SHOW_DIVIDER') as boolean;

  const FRAME_TOP = input.get('FRAME_TOP') as number;
  const FRAME_LEFT = input.get('FRAME_LEFT') as number;
  const FRAME_RIGHT = input.get('FRAME_RIGHT') as number;
  const FRAME_BOTTOM_EXTRA = input.get('FRAME_BOTTOM_EXTRA') as number;

  const HISTOGRAM_STYLE = input.get('HISTOGRAM_STYLE') as HistogramStyle;
  const HISTOGRAM_CHANNELS = input.get('HISTOGRAM_CHANNELS') as HistogramChannels;
  const HISTOGRAM_WIDTH_RATIO = input.get('HISTOGRAM_WIDTH_RATIO') as number;
  const HISTOGRAM_OPACITY = input.get('HISTOGRAM_OPACITY') as number;
  const HISTOGRAM_SMOOTHING = input.get('HISTOGRAM_SMOOTHING') as number;
  const HISTOGRAM_PRECISION = input.get('HISTOGRAM_PRECISION') as 'fast' | 'precise';
  const SHOW_GRID = input.get('SHOW_GRID') as boolean;
  const SHOW_CLIPPING = input.get('SHOW_CLIPPING') as boolean;

  // ── Build info rows ──
  // Always: Maker·Model / Lens / EXIF
  // Optional middle row: Date or Artist
  const maker = photo.make || '';
  const model = photo.model || '';
  const makerModel = [maker, model].filter(Boolean).join(' ');
  const lens = photo.lensModel || '';
  const exifParts = !store.disableExposureMeter
    ? [photo.focalLength, photo.fNumber, photo.exposureTime, photo.iso].filter(Boolean)
    : [];
  const exifText = exifParts.join('   ');

  // Middle row content: Artist takes priority over Date if both would apply.
  // Date sources in order: DATE_OVERRIDE > photo.takenAt
  let middleRow: { text: string; kind: 'date' | 'artist' } | null = null;
  if (ARTIST) {
    middleRow = { text: `© ${ARTIST}`, kind: 'artist' };
  } else if (SHOW_DATE) {
    const dateText = DATE_OVERRIDE || photo.takenAt;
    if (dateText) {
      middleRow = { text: dateText, kind: 'date' };
    }
  }

  // Effective row count drives strap height
  // Row 1: makerModel (always shown — even if empty, we keep the slot)
  // Row 2: lens
  // Row 3 (conditional): middleRow
  // Row 4: exif
  // Empty rows are simply blank — but in practice maker/lens/exif are
  // almost always populated. We count rendered rows for layout math:
  const rows: { text: string; weight: 'primary' | 'secondary' | 'artist' | 'exif' }[] = [];
  rows.push({ text: makerModel, weight: 'primary' });
  rows.push({ text: lens, weight: 'secondary' });
  if (middleRow) rows.push({ text: middleRow.text, weight: middleRow.kind === 'artist' ? 'artist' : 'secondary' });
  if (exifText) rows.push({ text: exifText, weight: 'exif' });

  const rowCount = rows.length;

  // ── Strap geometry ──
  // The strap is just tall enough to fit all rows with comfortable padding.
  const STRAP_HEIGHT = rowCount * ROW_HEIGHT + STRAP_PADDING_Y * 2;
  const PADDING_BOTTOM = STRAP_HEIGHT + FRAME_BOTTOM_EXTRA;

  // ── Palette ──
  const BACKGROUND_COLOR = DARK_MODE ? '#000000' : '#ffffff';
  const PRIMARY_TEXT_COLOR = DARK_MODE ? '#ffffff' : '#000000';
  const SECONDARY_TEXT_COLOR = DARK_MODE ? '#888888' : '#333333';

  const canvas = sandbox(photo, {
    targetRatio: store.ratio,
    notCroppedMode: store.notCroppedMode,
    backgroundColor: BACKGROUND_COLOR,
    padding: { top: FRAME_TOP, right: FRAME_RIGHT, bottom: PADDING_BOTTOM, left: FRAME_LEFT },
  });

  const ctx = canvas.getContext('2d')!;
  ctx.textBaseline = 'middle';

  // ── Coordinate anchors ──
  const strapTop = canvas.height - PADDING_BOTTOM;
  const strapInnerTop = strapTop + STRAP_PADDING_Y;
  const strapInnerBottom = strapTop + STRAP_HEIGHT - STRAP_PADDING_Y;
  const strapCenter = (strapInnerTop + strapInnerBottom) / 2;

  // ── Logo ──
  let logo: HTMLImageElement | undefined;
  if (SHOW_LOGO) {
    logo = resolveBrandLogo(photo, DARK_MODE ? 'dark' : 'light');
  }

  // Logo size scales with strap height so it stays balanced
  const LOGO_MAX_HEIGHT = Math.min(STRAP_HEIGHT * 0.55, 200);
  const LOGO_MAX_WIDTH = LOGO_MAX_HEIGHT * 1.6; // typical logo aspect cap
  const LOGO_COLUMN_X = SIDE_PADDING;

  // ── Histogram size & position ──
  const availableStrapWidth = canvas.width - SIDE_PADDING * 2;
  const histWidth = Math.round(availableStrapWidth * HISTOGRAM_WIDTH_RATIO);
  // Histogram height = full row stack so it visually matches the info block
  const histHeight = rowCount * ROW_HEIGHT;
  const histX = canvas.width - SIDE_PADDING - histWidth;
  const histY = strapCenter - histHeight / 2;

  const histogram = computeHistogram(photo, { precision: HISTOGRAM_PRECISION });
  drawHistogram(ctx, histogram, {
    x: histX,
    y: histY,
    width: histWidth,
    height: histHeight,
    style: HISTOGRAM_STYLE,
    channels: HISTOGRAM_CHANNELS,
    darkMode: DARK_MODE,
    smoothing: HISTOGRAM_SMOOTHING,
    opacity: HISTOGRAM_OPACITY,
    showGrid: SHOW_GRID,
    showClipping: SHOW_CLIPPING,
  });

  // ── Logo placement ──
  let textStartX = SIDE_PADDING;
  let logoRendered = false;
  if (logo && logo.complete && logo.naturalWidth > 0) {
    drawBrandLogo(ctx, logo, {
      x: LOGO_COLUMN_X,
      y: strapCenter,
      maxWidth: LOGO_MAX_WIDTH,
      maxHeight: LOGO_MAX_HEIGHT,
      anchor: 'left-center',
    });
    textStartX = LOGO_COLUMN_X + LOGO_MAX_WIDTH + LOGO_GUTTER;
    logoRendered = true;
  } else if (logo) {
    // Logo present but not yet decoded — reserve space to keep layout stable
    textStartX = LOGO_COLUMN_X + LOGO_MAX_WIDTH + LOGO_GUTTER;
    logoRendered = true;
  }

  // ── Divider between logo and text columns ──
  if (SHOW_DIVIDER && logoRendered) {
    ctx.strokeStyle = SECONDARY_TEXT_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const dividerX = textStartX - LOGO_GUTTER / 2;
    const dividerTop = strapInnerTop + 10;
    const dividerBottom = strapInnerBottom - 10;
    ctx.moveTo(dividerX, dividerTop);
    ctx.lineTo(dividerX, dividerBottom);
    ctx.stroke();
  }

  // ── Text right boundary (just before histogram with a small gap) ──
  const textRightLimit = histX - HIST_GUTTER;
  const textAvailWidth = Math.max(0, textRightLimit - textStartX);

  // ── Render rows ──
  ctx.textAlign = 'left';

  const FONT_PRIMARY_SIZE = ROW_HEIGHT * 0.7;
  const FONT_SECONDARY_SIZE = ROW_HEIGHT * 0.55;
  const FONT_EXIF_SIZE = ROW_HEIGHT * 0.62;

  rows.forEach((row, idx) => {
    const rowY = strapInnerTop + idx * ROW_HEIGHT + ROW_HEIGHT / 2;
    if (!row.text) return;

    if (row.weight === 'primary') {
      ctx.fillStyle = PRIMARY_TEXT_COLOR;
      ctx.font = `normal 600 ${FONT_PRIMARY_SIZE}px ${PRIMARY_FONT_FAMILY}`;
    } else if (row.weight === 'secondary') {
      ctx.fillStyle = SECONDARY_TEXT_COLOR;
      ctx.font = `normal ${SECONDARY_TEXT_FONT_WEIGHT} ${FONT_SECONDARY_SIZE}px ${SECONDARY_FONT_FAMILY}`;
    } else if (row.weight === 'artist') {
      ctx.fillStyle = SECONDARY_TEXT_COLOR;
      ctx.font = `normal ${ARTIST_FONT_WEIGHT} ${FONT_SECONDARY_SIZE}px ${SECONDARY_FONT_FAMILY}`;
    } else {
      // exif
      ctx.fillStyle = PRIMARY_TEXT_COLOR;
      ctx.font = `normal 500 ${FONT_EXIF_SIZE}px ${PRIMARY_FONT_FAMILY}`;
    }
    drawTextEllipsis(ctx, row.text, textStartX, rowY, textAvailWidth);
  });

  return canvas;
};

function drawTextEllipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number
): void {
  if (maxWidth <= 0) return;
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  let display = text;
  while (display.length > 0 && ctx.measureText(display + '…').width > maxWidth) {
    display = display.slice(0, -1);
  }
  if (display.length > 0) ctx.fillText(display + '…', x, y);
}

export { HISTOGRAM_FUNC, HISTOGRAM_OPTIONS };