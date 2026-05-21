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
 * Overlay Card theme — information overlaid on the photo.
 *
 *  ┌─────────────────────────────────────┐
 *  │ Seoul, Korea                        │   ← 좌상단 (사진 위에 겹침)
 *  │ 2026   © artist                     │
 *  │                                     │
 *  │            (photo)                  │
 *  │                                     │
 *  │                                     │
 *  │                                     │
 *  │                  FUJIFILM X-T3      │   ← 우하단 (사진 위에 겹침)
 *  │                  45mm f/11 1/60 ISO │
 *  └─────────────────────────────────────┘
 *
 * 가독성을 위해 두 영역(좌상단/우하단)에만 어두운 그라데이션을 깔아
 * 흰 텍스트가 사진 어떤 부분 위에서도 잘 보이도록 함.
 */

const OVERLAY_CARD_OPTIONS: ThemeOption[] = [
  // ── 상단 (좌상단: 장소 / 년도 / 아티스트) ──
  { id: 'LOCATION', type: 'string', default: 'Seoul, Korea', label: '장소', group: '상단 (좌상단)', description: '\\n 줄바꿈 가능' },
  { id: 'LOCATION_FONT', type: 'select', default: '나눔명조 (한글용)', options: FONT_LABELS, label: '장소 폰트', group: '상단 (좌상단)', row: 'location-font' },
  { id: 'LOCATION_FONT_SIZE', type: 'number', default: 89, label: '장소 폰트 크기', group: '상단 (좌상단)', description: 'px', row: 'location-font' },
  { id: 'LOCATION_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 700, label: '장소 폰트 굵기', group: '상단 (좌상단)' },
  { id: 'YEAR_OVERRIDE', type: 'string', default: '', label: '년도 (수동)', group: '상단 (좌상단)' },
  { id: 'YEAR_FONT', type: 'select', default: FONT_LABELS[0], options: FONT_LABELS, label: '년도 폰트', group: '상단 (좌상단)', row: 'year-font' },
  { id: 'YEAR_FONT_SIZE', type: 'number', default: 69, label: '년도 폰트 크기', group: '상단 (좌상단)', description: 'px', row: 'year-font' },
  { id: 'YEAR_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 400, label: '년도 폰트 굵기', group: '상단 (좌상단)' },
  { id: 'ARTIST', type: 'string', default: '', label: '아티스트', group: '상단 (좌상단)' },
  { id: 'ARTIST_FONT_WEIGHT', type: 'range-slider', min: 100, max: 900, step: 100, default: 400, label: '아티스트 굵기', group: '상단 (좌상단)' },
  { id: 'TOP_CLUSTER_GAP', type: 'number', default: 6, label: '항목 간 간격', group: '상단 (좌상단)', description: 'px' },

  // ── 하단 (우하단: 카메라 / 렌즈 / EXIF) ──
  { id: 'SHOW_EXIF',             type: 'boolean',      default: true, label: 'EXIF 표시',     group: '하단 (우하단)' },
  { id: 'SHOW_ICONS',             type: 'boolean',      default: true, label: '아이콘 표시',   group: '하단 (우하단)' },
  { id: 'CAMERA_FONT_SIZE',       type: 'number',       default: 60,   label: '폰트 크기',     group: '하단 (우하단)', description: 'px' },
  { id: 'EXIF_GAP',               type: 'number',       default: 40,   label: 'EXIF 항목 간격', group: '하단 (우하단)', description: 'px' },
  { id: 'PRIMARY_FONT_WEIGHT',    type: 'range-slider', min: 400, max: 900, step: 100, default: 700, label: '카메라명 굵기',   group: '하단 (우하단)' },
  { id: 'SECONDARY_FONT_WEIGHT',  type: 'range-slider', min: 100, max: 600, step: 100, default: 400, label: '렌즈/EXIF 굵기', group: '하단 (우하단)' },

  // ── 색상 ──
  { id: 'TOP_TEXT_COLOR',    type: 'color', default: '#ffffff', label: '상단 텍스트', group: '색상' },
  { id: 'BOTTOM_TEXT_COLOR', type: 'color', default: '#ffffff', label: '하단 텍스트', group: '색상' },

  // ── 그라데이션 (가독성 보조) ──
  { id: 'TOP_GRADIENT_OPACITY',    type: 'range-slider', min: 0, max: 1, step: 0.05, default: 0, label: '좌상단 어두움',  group: '그라데이션' },
  { id: 'TOP_GRADIENT_SIZE',       type: 'range-slider', min: 0.15, max: 0.6, step: 0.05, default: 0.35, label: '좌상단 영역 크기', group: '그라데이션', description: '사진 크기 대비' },
  { id: 'BOTTOM_GRADIENT_OPACITY', type: 'range-slider', min: 0, max: 1, step: 0.05, default: 0, label: '우하단 어두움',  group: '그라데이션' },
  { id: 'BOTTOM_GRADIENT_SIZE',    type: 'range-slider', min: 0.15, max: 0.6, step: 0.05, default: 0.35, label: '우하단 영역 크기', group: '그라데이션', description: '사진 크기 대비' },

  // ── 레이아웃 ──
  { id: 'OVERLAY_PADDING', type: 'number', default: 80, label: '가장자리 여백', group: '레이아웃', description: 'px — 가장자리에서 텍스트까지' },
];

const OVERLAY_CARD_FUNC: ThemeFunc = (photo: Photo, input: ThemeOptionInput, store: Store) => {
  const LOCATION_RAW = input.get('LOCATION') as string;
  const LOCATION_FONT_LABEL = input.get('LOCATION_FONT') as string;
  const LOCATION_FONT_SIZE = input.get('LOCATION_FONT_SIZE') as number;
  const YEAR_OVERRIDE = (input.get('YEAR_OVERRIDE') as string).trim();
  const YEAR_FONT_LABEL = input.get('YEAR_FONT') as string;
  const YEAR_FONT_SIZE = input.get('YEAR_FONT_SIZE') as number;
  const ARTIST = (input.get('ARTIST') as string).trim();
  const TOP_CLUSTER_GAP = input.get('TOP_CLUSTER_GAP') as number;
  const CAMERA_FONT_SIZE = input.get('CAMERA_FONT_SIZE') as number;
  const SHOW_EXIF = input.get('SHOW_EXIF') as boolean;
  const SHOW_ICONS = input.get('SHOW_ICONS') as boolean;
  const EXIF_GAP = input.get('EXIF_GAP') as number;
  const TOP_TEXT_COLOR = input.get('TOP_TEXT_COLOR') as string;
  const BOTTOM_TEXT_COLOR = input.get('BOTTOM_TEXT_COLOR') as string;
  const OVERLAY_PADDING = input.get('OVERLAY_PADDING') as number;
  const TOP_GRADIENT_OPACITY = input.get('TOP_GRADIENT_OPACITY') as number;
  const TOP_GRADIENT_SIZE    = input.get('TOP_GRADIENT_SIZE') as number;
  const BOTTOM_GRADIENT_OPACITY = input.get('BOTTOM_GRADIENT_OPACITY') as number;
  const BOTTOM_GRADIENT_SIZE    = input.get('BOTTOM_GRADIENT_SIZE') as number;
  const PRIMARY_FONT_WEIGHT = input.get('PRIMARY_FONT_WEIGHT') as number;
  const SECONDARY_FONT_WEIGHT = input.get('SECONDARY_FONT_WEIGHT') as number;
  const LOCATION_FONT_WEIGHT = input.get('LOCATION_FONT_WEIGHT') as number;
  const YEAR_FONT_WEIGHT = input.get('YEAR_FONT_WEIGHT') as number;
  const ARTIST_FONT_WEIGHT = input.get('ARTIST_FONT_WEIGHT') as number;

  const locationFontFamily = resolveFontFamily(LOCATION_FONT_LABEL);
  const yearFontFamily     = resolveFontFamily(YEAR_FONT_LABEL);
  const baseFontFamily     = resolveFontFamily(FONT_LABELS[0]);

  // Overlay 테마는 사진 자체가 캔버스 — padding 0
  const canvas = sandbox(photo, {
    targetRatio: store.ratio,
    notCroppedMode: store.notCroppedMode,
    backgroundColor: '#000000',
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;

  // ===== TOP-LEFT GRADIENT =====
  const gradTopH = H * TOP_GRADIENT_SIZE;
  const gradTopW = W * TOP_GRADIENT_SIZE * 1.6;
  const gradTop = ctx.createLinearGradient(0, 0, 0, gradTopH);
  gradTop.addColorStop(0, `rgba(0,0,0,${TOP_GRADIENT_OPACITY})`);
  gradTop.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradTop;
  ctx.fillRect(0, 0, gradTopW, gradTopH);

  // ===== BOTTOM-RIGHT GRADIENT =====
  const gradBotH = H * BOTTOM_GRADIENT_SIZE * 0.7;
  const gradBotW = W * BOTTOM_GRADIENT_SIZE * 1.4;
  const gradBot = ctx.createLinearGradient(0, H, 0, H - gradBotH);
  gradBot.addColorStop(0, `rgba(0,0,0,${BOTTOM_GRADIENT_OPACITY})`);
  gradBot.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradBot;
  ctx.fillRect(W - gradBotW, H - gradBotH, gradBotW, gradBotH);

  // 텍스트 색상 — 옵션값에서 alpha 변형해 secondary/dim 생성
  const TOP_PRIMARY      = TOP_TEXT_COLOR;
  const TOP_SECONDARY    = withAlpha(TOP_TEXT_COLOR, 0.78);
  const TOP_DIM          = withAlpha(TOP_TEXT_COLOR, 0.60);
  const BOTTOM_PRIMARY   = BOTTOM_TEXT_COLOR;
  const BOTTOM_SECONDARY = withAlpha(BOTTOM_TEXT_COLOR, 0.78);

  // ===== TOP-LEFT TEXT =====
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = TOP_PRIMARY;
  ctx.font = `${LOCATION_FONT_WEIGHT} ${LOCATION_FONT_SIZE}px ${locationFontFamily}`;
  const locationLines = normalizeLineBreaks(LOCATION_RAW).split('\n');
  let topCursorY = OVERLAY_PADDING + LOCATION_FONT_SIZE;
  for (let i = 0; i < locationLines.length; i++) {
    ctx.fillText(locationLines[i].trim(), OVERLAY_PADDING, topCursorY);
    if (i < locationLines.length - 1) {
      topCursorY += LOCATION_FONT_SIZE * 1.1;
    }
  }

  const year = YEAR_OVERRIDE || extractYear(photo.takenAt) || '';
  if (year) {
    topCursorY += TOP_CLUSTER_GAP + YEAR_FONT_SIZE;
    ctx.fillStyle = TOP_SECONDARY;
    ctx.font = `${YEAR_FONT_WEIGHT} ${YEAR_FONT_SIZE}px ${yearFontFamily}`;
    ctx.fillText(year, OVERLAY_PADDING, topCursorY);
  }

  if (ARTIST) {
    if (!year) topCursorY += TOP_CLUSTER_GAP + YEAR_FONT_SIZE;
    else       topCursorY += TOP_CLUSTER_GAP + YEAR_FONT_SIZE * 0.8;
    ctx.fillStyle = TOP_DIM;
    ctx.font = `${ARTIST_FONT_WEIGHT} ${YEAR_FONT_SIZE * 0.78}px ${baseFontFamily}`;
    ctx.fillText(`© ${ARTIST}`, OVERLAY_PADDING, topCursorY);
  }

  // ===== BOTTOM-RIGHT TEXT =====
  // EXIF parts
  const exifParts = SHOW_EXIF && !store.disableExposureMeter
    ? [
        photo.focalLength,
        photo.fNumber,
        photo.exposureTime,
        photo.iso,
      ].filter(Boolean) as string[]
    : [];

  // 카메라 이름은 1줄, EXIF는 그 아래 1줄 (오른쪽 정렬)
  ctx.textAlign = 'right';
  const rightX = W - OVERLAY_PADDING;
  const exifLineH = CAMERA_FONT_SIZE * 1.4;
  const cameraName = [photo.make, photo.model].filter(Boolean).join(' ').trim();

  // 하단에서부터 위로 그리기
  let bottomCursorY = H - OVERLAY_PADDING;

  // EXIF 줄
  if (exifParts.length > 0) {
    if (SHOW_ICONS) {
      // 아이콘 + 값을 가로로, 오른쪽 정렬.
      // 텍스트와 아이콘이 동일한 시각적 중심선에 오도록 textBaseline='middle' 사용.
      const iconSize = CAMERA_FONT_SIZE * 1.0;
      const iconGap  = CAMERA_FONT_SIZE * 0.35;
      const between  = EXIF_GAP;  // 사용자 설정 — EXIF 항목 사이 간격

      // 시각적 중심선 — bottomCursorY는 baseline 좌표였으므로
      // 그 위로 폰트 높이의 절반쯤 올라간 지점이 글자의 중앙.
      const centerY = bottomCursorY - CAMERA_FONT_SIZE * 0.35;

      // 폭 측정
      ctx.font = `500 ${CAMERA_FONT_SIZE}px ${baseFontFamily}`;
      const items = exifParts.map((v, idx) => ({
        icon: pickIcon(idx, exifParts.length),
        value: v,
        width: iconSize + iconGap + ctx.measureText(v).width,
      }));
      const totalW = items.reduce((s, it) => s + it.width, 0) + between * (items.length - 1);

      let xCur = rightX - totalW;
      for (const it of items) {
        // 아이콘 (중심을 centerY에)
        if (it.icon === 'iso') {
          drawIsoIcon(ctx, xCur + iconSize / 2, centerY, iconSize, BOTTOM_PRIMARY, 2.5);
        } else {
          drawIcon(ctx, it.icon, {
            cx: xCur + iconSize / 2, cy: centerY, size: iconSize,
            color: BOTTOM_PRIMARY, strokeWidth: 2.5,
          });
        }
        xCur += iconSize + iconGap;
        // 값 (textBaseline='middle'로 그려 아이콘 중심과 정렬)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = BOTTOM_PRIMARY;
        ctx.font = `500 ${CAMERA_FONT_SIZE}px ${baseFontFamily}`;
        ctx.fillText(it.value, xCur, centerY);
        xCur += ctx.measureText(it.value).width + between;
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
    } else {
      // 아이콘 없을 때: 값들을 가로로 나열하고 사이에 가운데 점(·) + 사용자 설정 간격
      ctx.fillStyle = BOTTOM_PRIMARY;
      ctx.font = `500 ${CAMERA_FONT_SIZE}px ${baseFontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      // 각 토큰: 값, 그리고 그 다음에 (마지막이 아니면) "·"
      // 전체 폭 측정 후 오른쪽 끝(rightX)에 맞춰 시작 X 계산.
      const dotW = ctx.measureText('·').width;
      let totalW = 0;
      const widths = exifParts.map((v) => ctx.measureText(v).width);
      for (let i = 0; i < exifParts.length; i++) {
        totalW += widths[i];
        if (i < exifParts.length - 1) totalW += EXIF_GAP + dotW + EXIF_GAP;
      }
      let xCur = rightX - totalW;
      for (let i = 0; i < exifParts.length; i++) {
        ctx.fillText(exifParts[i], xCur, bottomCursorY);
        xCur += widths[i];
        if (i < exifParts.length - 1) {
          xCur += EXIF_GAP;
          ctx.fillText('·', xCur, bottomCursorY);
          xCur += dotW + EXIF_GAP;
        }
      }
      ctx.textAlign = 'right';
    }
    bottomCursorY -= exifLineH;
  }

  // Lens 줄
  if (photo.lensModel) {
    ctx.fillStyle = BOTTOM_SECONDARY;
    ctx.font = `${SECONDARY_FONT_WEIGHT} ${CAMERA_FONT_SIZE * 0.85}px ${baseFontFamily}`;
    ctx.fillText(photo.lensModel, rightX, bottomCursorY);
    bottomCursorY -= CAMERA_FONT_SIZE * 1.2;
  }

  // 카메라 이름
  if (cameraName) {
    ctx.fillStyle = BOTTOM_PRIMARY;
    ctx.font = `${PRIMARY_FONT_WEIGHT} ${CAMERA_FONT_SIZE * 1.05}px ${baseFontFamily}`;
    ctx.fillText(cameraName, rightX, bottomCursorY);
  }

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

/**
 * #rgb / #rrggbb / rgb()-인 색상 문자열을 받아 alpha 곱한 rgba()를 반환.
 * Overlay 테마에서 단일 색상 옵션으로 primary/secondary/dim을 만들기 위해 사용.
 */
function withAlpha(color: string, alpha: number): string {
  const c = color.trim();
  if (c.startsWith('#')) {
    let r: number, g: number, b: number;
    if (c.length === 4) {
      r = parseInt(c[1] + c[1], 16);
      g = parseInt(c[2] + c[2], 16);
      b = parseInt(c[3] + c[3], 16);
    } else {
      r = parseInt(c.slice(1, 3), 16);
      g = parseInt(c.slice(3, 5), 16);
      b = parseInt(c.slice(5, 7), 16);
    }
    return `rgba(${r},${g},${b},${alpha})`;
  }
  // rgb(r,g,b) → rgba(r,g,b,alpha)
  if (c.startsWith('rgb(')) {
    return c.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
  }
  return c;
}

function normalizeLineBreaks(s: string): string {
  return s.replace(/\\n/g, '\n');
}

export { OVERLAY_CARD_FUNC, OVERLAY_CARD_OPTIONS };