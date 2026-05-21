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
import { computeHistogram, drawHistogram, HistogramStyle } from '../../core/drawing/histogram';
import { drawIcon, drawIsoIcon } from '../../core/drawing/canvas-icons';
import { FONT_LABELS, resolveFontFamily } from '../_shared/fonts';

/**
 * Modern Overlay theme — v2.
 *
 * Changes from v1:
 *  - Info panel is now a STRAP below the photo (not an overlay on top)
 *  - Compact vertical layout: 2-row info cluster with much less whitespace
 *  - Icons sit right next to their values (small gap), not far above
 *  - Camera/lens text scales up — it's the main subject of the strap
 *  - ALL sizes derive from photo width via a single `scale` factor so
 *    the strap looks the same at any image dimension (8MP phone shot
 *    vs 100MP medium-format both look balanced)
 *
 * Layout proportions (relative to photo width W):
 *   strap height           = 0.115 * W   (≈ 11.5% of photo width)
 *   inner padding          = 0.025 * W
 *   primary text size      = 0.030 * W
 *   secondary text size    = 0.020 * W
 *   icon size              = 0.045 * W
 *   value text size        = 0.027 * W
 *   label text size        = 0.013 * W
 */

const MODERN_OVERLAY_OPTIONS: ThemeOption[] = [
  // ── 외형 ──
  { id: 'WALL_COLOR_DARK', type: 'boolean', default: false, label: '다크 배경', group: '외형' },

  // ── 표시 항목 ──
  { id: 'SHOW_CAMERA',   type: 'boolean', default: true,  label: '카메라',     group: '표시 항목' },
  { id: 'SHOW_LENS',     type: 'boolean', default: true,  label: '렌즈',       group: '표시 항목' },
  { id: 'SHOW_FOCAL',    type: 'boolean', default: true,  label: '화각',       group: '표시 항목' },
  { id: 'SHOW_APERTURE', type: 'boolean', default: true,  label: '조리개',     group: '표시 항목' },
  { id: 'SHOW_SHUTTER',  type: 'boolean', default: true,  label: '셔터',       group: '표시 항목' },
  { id: 'SHOW_ISO',      type: 'boolean', default: true,  label: 'ISO',       group: '표시 항목' },
  { id: 'SHOW_EV',       type: 'boolean', default: false, label: '노출 보정',  group: '표시 항목', description: '히스토그램 공간 차지' },
  { id: 'SHOW_HISTOGRAM',type: 'boolean', default: true,  label: '히스토그램', group: '표시 항목' },
  { id: 'EXPOSURE_COMP', type: 'string',  default: '',    label: '노출 보정 값 (수동)', group: '표시 항목', description: '비우면 EXIF 자동 인식' },

  // ── 폰트 ──
  { id: 'PRIMARY_FONT',   type: 'select', default: FONT_LABELS[0], options: FONT_LABELS, label: '주 텍스트 폰트',   group: '폰트', description: '카메라/렌즈' },
  { id: 'SECONDARY_FONT', type: 'select', default: FONT_LABELS[0], options: FONT_LABELS, label: '보조 텍스트 폰트', group: '폰트', description: 'EXIF 값·라벨' },

  // ── 크기 / 간격 ──
  { id: 'CAMERA_SIZE_MULT',    type: 'range-slider', default: 0.9,  min: 0.5, max: 2,   step: 0.05, label: '카메라/렌즈 크기',    group: '크기 / 간격' },
  { id: 'EXIF_SIZE_MULT',      type: 'range-slider', default: 1,    min: 0.5, max: 2,   step: 0.05, label: '촬영 정보 크기',      group: '크기 / 간격', description: '값·라벨' },
  { id: 'EXIF_ICON_SIZE_MULT', type: 'range-slider', default: 0.8,  min: 0.3, max: 1.5, step: 0.05, label: '아이콘 크기',         group: '크기 / 간격', description: '값 크기와 별도' },
  { id: 'HISTOGRAM_SIZE_MULT', type: 'range-slider', default: 1.05, min: 0.5, max: 2,   step: 0.05, label: '히스토그램 크기',     group: '크기 / 간격' },
  { id: 'CAMERA_EXIF_GAP',     type: 'number',       default: 66, label: '카메라 ↔ 촬영 정보', group: '크기 / 간격', description: 'px' },
  { id: 'EXIF_GAP',            type: 'number',       default: 35, label: '촬영 정보 항목 간격', group: '크기 / 간격', description: 'px — 조리개·셔터·ISO 사이' },
  { id: 'EXIF_ICON_GAP',       type: 'number',       default: 22, label: '아이콘 ↔ 값',         group: '크기 / 간격', description: 'px — segment 내부 세로' },

  // ── 레이아웃 ──
  { id: 'FRAME_TOP',          type: 'number',       default: 60, label: '상단 여백',      group: '레이아웃', description: 'px' },
  { id: 'FRAME_SIDE',         type: 'number',       default: 60, label: '좌우 여백',      group: '레이아웃', description: 'px' },
  { id: 'FRAME_BOTTOM_EXTRA', type: 'number',       default: 0,  label: '하단 추가 여백', group: '레이아웃', description: 'px' },
  { id: 'GAP_PHOTO_STRAP',    type: 'number',       default: 18, label: '사진 ↔ 스트랩',  group: '레이아웃', description: 'px' },
  { id: 'STRAP_HEIGHT_RATIO', type: 'range-slider', default: 0.1, min: 0.07, max: 0.18, step: 0.005, label: '스트랩 높이', group: '레이아웃', description: '사진 폭 대비' },
  { id: 'STRAP_CORNER_RADIUS',type: 'number',       default: 18, label: '스트랩 모서리',  group: '레이아웃', description: 'px' },

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
    id: 'HISTOGRAM_PRECISION',
    type: 'select',
    options: ['fast', 'precise'],
    default: 'fast',
    label: '정확도',
    group: '히스토그램',
    description: 'precise는 더 정확하지만 느림',
  },
  { id: 'HISTOGRAM_OPACITY',   type: 'range-slider', default: 0.55, min: 0.2, max: 1, step: 0.05, label: '투명도',   group: '히스토그램' },
  { id: 'HISTOGRAM_SMOOTHING', type: 'range-slider', default: 0.9,  min: 0,   max: 1, step: 0.05, label: '스무딩',   group: '히스토그램', description: '0 = 날카로움' },
];

const MODERN_OVERLAY_FUNC: ThemeFunc = (photo: Photo, input: ThemeOptionInput, store: Store) => {
  const FRAME_TOP = input.get('FRAME_TOP') as number;
  const FRAME_SIDE = input.get('FRAME_SIDE') as number;
  const FRAME_BOTTOM_EXTRA = input.get('FRAME_BOTTOM_EXTRA') as number;
  const GAP_PHOTO_STRAP = input.get('GAP_PHOTO_STRAP') as number;
  const WALL_COLOR_DARK = input.get('WALL_COLOR_DARK') as boolean;
  const STRAP_HEIGHT_RATIO = input.get('STRAP_HEIGHT_RATIO') as number;
  const STRAP_CORNER_RADIUS = input.get('STRAP_CORNER_RADIUS') as number;
  const SHOW_CAMERA = input.get('SHOW_CAMERA') as boolean;
  const SHOW_LENS = input.get('SHOW_LENS') as boolean;
  const SHOW_FOCAL = input.get('SHOW_FOCAL') as boolean;
  const SHOW_APERTURE = input.get('SHOW_APERTURE') as boolean;
  const SHOW_SHUTTER = input.get('SHOW_SHUTTER') as boolean;
  const SHOW_ISO = input.get('SHOW_ISO') as boolean;
  const SHOW_EV = input.get('SHOW_EV') as boolean;
  const SHOW_HISTOGRAM = input.get('SHOW_HISTOGRAM') as boolean;
  const HISTOGRAM_STYLE = input.get('HISTOGRAM_STYLE') as HistogramStyle;
  const HISTOGRAM_PRECISION = input.get('HISTOGRAM_PRECISION') as 'fast' | 'precise';
  const HISTOGRAM_OPACITY = input.get('HISTOGRAM_OPACITY') as number;
  const HISTOGRAM_SMOOTHING = input.get('HISTOGRAM_SMOOTHING') as number;
  // 노출 보정값: 사용자가 수동 입력했으면 그 값, 비어있으면 EXIF 자동 인식
  const EXPOSURE_COMP_INPUT = (input.get('EXPOSURE_COMP') as string).trim();
  const EXPOSURE_COMP = EXPOSURE_COMP_INPUT || photo.exposureBias || '0';
  const CAMERA_SIZE_MULT = input.get('CAMERA_SIZE_MULT') as number;
  const EXIF_SIZE_MULT = input.get('EXIF_SIZE_MULT') as number;
  const EXIF_ICON_SIZE_MULT = input.get('EXIF_ICON_SIZE_MULT') as number;
  const HISTOGRAM_SIZE_MULT = input.get('HISTOGRAM_SIZE_MULT') as number;
  const EXIF_GAP = input.get('EXIF_GAP') as number;
  const EXIF_ICON_GAP = input.get('EXIF_ICON_GAP') as number;
  const CAMERA_EXIF_GAP = input.get('CAMERA_EXIF_GAP') as number;
  const PRIMARY_FONT_FAMILY = resolveFontFamily(input.get('PRIMARY_FONT') as string);
  const SECONDARY_FONT_FAMILY = resolveFontFamily(input.get('SECONDARY_FONT') as string);

  // ── Compute strap dimensions ──
  // The strap height (and everything inside it) scales with photo width.
  // We need to know photo width first, which we get from sandbox's
  // notCroppedMode-respecting logic. The padding bottom we pass to
  // sandbox determines the strap area below the photo.
  //
  // Photo width in the final canvas equals canvas.width - 2 * FRAME_SIDE.
  // But canvas dimensions depend on the original image and the target
  // ratio. To keep things simple and predictable, we compute strap
  // height as a fraction of (image.width when rendered at sandbox
  // resolution), which sandbox uses as the photo width.

  // Use the photo's source width as the baseline for the scale factor.
  // sandbox preserves this width unchanged for the photo's rendered size.
  const photoWidthEstimate = photo.image.width;
  const strapHeight = Math.round(photoWidthEstimate * STRAP_HEIGHT_RATIO);
  const PADDING_BOTTOM = GAP_PHOTO_STRAP + strapHeight + FRAME_BOTTOM_EXTRA;

  // ── Colors ──
  const wall = WALL_COLOR_DARK ? '#0a0a0a' : '#f3f3f3';
  const STRAP_BG = WALL_COLOR_DARK ? 'rgba(22, 22, 24, 0.96)' : 'rgba(245, 245, 245, 0.98)';
  const STRAP_BORDER = WALL_COLOR_DARK ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.10)';
  const TEXT_PRIMARY = WALL_COLOR_DARK ? '#ffffff' : '#0a0a0a';
  const TEXT_SECONDARY = WALL_COLOR_DARK ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
  const TEXT_LABEL = WALL_COLOR_DARK ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const DIVIDER_COLOR = WALL_COLOR_DARK ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';

  const canvas = sandbox(photo, {
    targetRatio: store.ratio,
    notCroppedMode: store.notCroppedMode,
    backgroundColor: wall,
    padding: { top: FRAME_TOP, right: FRAME_SIDE, bottom: PADDING_BOTTOM, left: FRAME_SIDE },
  });

  const ctx = canvas.getContext('2d')!;

  // ── Actual photo bounds ──
  const photoX = FRAME_SIDE;
  const photoY = FRAME_TOP;
  const photoW = canvas.width - FRAME_SIDE * 2;
  const photoH = canvas.height - FRAME_TOP - PADDING_BOTTOM;

  // ── Strap bounds — sits below the photo, aligned to it ──
  const strapX = photoX;
  const strapY = photoY + photoH + GAP_PHOTO_STRAP;
  const strapW = photoW;
  const strapH = strapHeight;

  // ── Scale factor — everything inside the strap derives from this ──
  // Using strapW (= photoW) means proportions stay constant for any
  // photo aspect ratio. Multiply by these ratios:
  const scale = strapW;
  const PRIMARY_FONT_SIZE = scale * 0.030 * CAMERA_SIZE_MULT;
  const SECONDARY_FONT_SIZE = scale * 0.020 * CAMERA_SIZE_MULT;
  const VALUE_FONT_SIZE = scale * 0.027 * EXIF_SIZE_MULT;
  const LABEL_FONT_SIZE = scale * 0.013 * EXIF_SIZE_MULT;
  const SUBLABEL_FONT_SIZE = scale * 0.010 * EXIF_SIZE_MULT;
  const ICON_SIZE = scale * 0.045 * EXIF_SIZE_MULT * EXIF_ICON_SIZE_MULT;
  const ICON_STROKE = Math.max(1.5, scale * 0.0018 * EXIF_SIZE_MULT * EXIF_ICON_SIZE_MULT);
  const INNER_PADDING_X = scale * 0.020;
  const INNER_PADDING_Y = scale * 0.015;
  const ICON_VALUE_GAP = EXIF_ICON_GAP;

  // ── Draw the strap ──
  fillRoundedRect(ctx, strapX, strapY, strapW, strapH, STRAP_CORNER_RADIUS, STRAP_BG);
  strokeRoundedRect(ctx, strapX, strapY, strapW, strapH, STRAP_CORNER_RADIUS, STRAP_BORDER, 1);

  // ── Build segments based on enabled options ──
  const segments: Segment[] = [];

  if (SHOW_CAMERA || SHOW_LENS || SHOW_FOCAL) {
    segments.push({ kind: 'camera', weight: 2.8 });
  }
  // EXIF segments는 작은 weight — 카메라 옆에 좁게 붙음. 남는 폭은 histogram이 차지.
  if (SHOW_APERTURE) segments.push({ kind: 'aperture', weight: 0.7 });
  if (SHOW_SHUTTER)  segments.push({ kind: 'shutter',  weight: 0.7 });
  if (SHOW_ISO)      segments.push({ kind: 'iso',      weight: 0.7 });
  if (SHOW_EV)       segments.push({ kind: 'ev',       weight: 0.7 });
  if (SHOW_HISTOGRAM) segments.push({ kind: 'histogram', weight: 2.6 * HISTOGRAM_SIZE_MULT });

  if (segments.length === 0) return canvas;

  // ── Allocate widths (measured-based) ──
  // 각 segment의 실제 필요한 폭을 측정해서 배분.
  //  - camera: 가장 긴 텍스트 폭 + 아이콘 + 여백
  //  - EXIF (aperture/shutter/iso/ev): max(아이콘, 값 텍스트) + 약간의 여백
  //  - histogram: 남는 폭 전부 차지
  const EXIF_KINDS: SegmentKind[] = ['aperture', 'shutter', 'iso', 'ev'];

  // 측정용 임시 ctx font 세팅 helper
  function measureText(text: string, size: number, family: string, weight: number): number {
    ctx.font = `${weight} ${size}px ${family}`;
    return ctx.measureText(text).width;
  }

  // 각 segment의 본질적 폭 계산
  const segWidths: number[] = segments.map((seg) => {
    if (seg.kind === 'camera') {
      const lines: { text: string; size: number; weight: number }[] = [];
      if (SHOW_CAMERA) {
        const cam = [photo.make, photo.model].filter(Boolean).join(' ').trim();
        if (cam) lines.push({ text: cam, size: PRIMARY_FONT_SIZE, weight: 600 });
      }
      if (SHOW_LENS && photo.lensModel) {
        lines.push({ text: photo.lensModel, size: SECONDARY_FONT_SIZE, weight: 400 });
      }
      if (SHOW_FOCAL && photo.focalLength) {
        lines.push({ text: photo.focalLength, size: SECONDARY_FONT_SIZE * 0.85, weight: 400 });
      }
      const maxTextW = Math.max(0, ...lines.map((l) =>
        measureText(l.text, l.size, PRIMARY_FONT_FAMILY, l.weight)));
      // 카메라 segment 내부: [아이콘 + 작은 고정 gap + 텍스트 + 우측 살짝 패딩]
      // 아이콘↔텍스트 간격은 EXIF의 세로 stack 간격과 무관하게 고정.
      const cameraIconTextGap = PRIMARY_FONT_SIZE * 0.5;
      return ICON_SIZE * 0.5 + ICON_SIZE * 0.6 + cameraIconTextGap + maxTextW + PRIMARY_FONT_SIZE * 0.3;
    }
    if (EXIF_KINDS.includes(seg.kind)) {
      // 아이콘과 값 중 더 넓은 쪽 + 약간의 좌우 패딩
      let valText = '—';
      if (seg.kind === 'aperture') valText = photo.fNumber || '—';
      else if (seg.kind === 'shutter') valText = photo.exposureTime || '—';
      else if (seg.kind === 'iso') valText = photo.iso?.replace(/^ISO\s*/i, '') || '—';
      else if (seg.kind === 'ev') valText = EXPOSURE_COMP || '0';
      const valW = measureText(valText, VALUE_FONT_SIZE, SECONDARY_FONT_FAMILY, 500);
      // EV는 더 넓은 scale을 그리므로 추가 폭
      const minW = seg.kind === 'ev' ? VALUE_FONT_SIZE * 4 : 0;
      return Math.max(ICON_SIZE * 1.4, valW + VALUE_FONT_SIZE * 0.6, minW);
    }
    // histogram — 사용자 설정 크기. base = strap 폭의 약 30%, multiplier로 가감.
    return strapW * 0.30 * HISTOGRAM_SIZE_MULT;
  });

  // EXIF segments 사이 gap 폭
  let exifGapCount = 0;
  for (let i = 1; i < segments.length; i++) {
    if (EXIF_KINDS.includes(segments[i - 1].kind) && EXIF_KINDS.includes(segments[i].kind)) {
      exifGapCount++;
    }
  }
  const totalGapWidth = exifGapCount * EXIF_GAP;

  // ── 배치 ──
  // 카메라+EXIF는 좌측에 측정된 폭대로 차곡차곡, 히스토그램은 strap 우측 끝에 자기 폭만큼.
  // 사이 빈 공간은 자동.
  const histIdx = segments.findIndex((s) => s.kind === 'histogram');
  const innerLeft  = strapX + INNER_PADDING_X;
  const innerRight = strapX + strapW - INNER_PADDING_X;

  // 각 segment의 X 좌표 미리 계산
  const segXs: number[] = new Array(segments.length).fill(0);
  // (1) 카메라+EXIF: 좌측부터 누적
  let leftCursor = innerLeft;
  segments.forEach((seg, idx) => {
    if (idx === histIdx) return;
    segXs[idx] = leftCursor;
    leftCursor += segWidths[idx];
    const nextSeg = segments[idx + 1];
    if (!nextSeg || idx + 1 === histIdx) return;
    // 카메라 → EXIF 첫 항목: CAMERA_EXIF_GAP
    if (seg.kind === 'camera' && EXIF_KINDS.includes(nextSeg.kind)) {
      leftCursor += CAMERA_EXIF_GAP;
    }
    // EXIF segments 사이: EXIF_GAP
    else if (EXIF_KINDS.includes(seg.kind) && EXIF_KINDS.includes(nextSeg.kind)) {
      leftCursor += EXIF_GAP;
    }
  });
  // (2) 히스토그램: 우측 끝
  if (histIdx !== -1) {
    segXs[histIdx] = innerRight - segWidths[histIdx];
  }

  // 좌측 그룹이 히스토그램을 침범하면 좌측 폭 축소(과도 케이스 방어)
  if (histIdx !== -1 && leftCursor > segXs[histIdx]) {
    const overflow = leftCursor - segXs[histIdx];
    // 카메라 폭에서 우선 줄임
    const cameraIdx = segments.findIndex((s) => s.kind === 'camera');
    if (cameraIdx !== -1) {
      segWidths[cameraIdx] = Math.max(40, segWidths[cameraIdx] - overflow);
      // 재배치
      leftCursor = innerLeft;
      segments.forEach((seg, idx) => {
        if (idx === histIdx) return;
        segXs[idx] = leftCursor;
        leftCursor += segWidths[idx];
        const nextSeg = segments[idx + 1];
        if (!nextSeg || idx + 1 === histIdx) return;
        if (seg.kind === 'camera' && EXIF_KINDS.includes(nextSeg.kind)) {
          leftCursor += CAMERA_EXIF_GAP;
        } else if (EXIF_KINDS.includes(seg.kind) && EXIF_KINDS.includes(nextSeg.kind)) {
          leftCursor += EXIF_GAP;
        }
      });
    }
  }

  // unused warning 방지
  void totalGapWidth;

  segments.forEach((seg, idx) => {
    const segW = segWidths[idx];
    const segX = segXs[idx];
    const segY = strapY + INNER_PADDING_Y;
    const segH = strapH - INNER_PADDING_Y * 2;

    const ctxOpts: SegmentContext = {
      x: segX, y: segY, w: segW, h: segH,
      photo,
      sizes: {
        primary: PRIMARY_FONT_SIZE,
        secondary: SECONDARY_FONT_SIZE,
        value: VALUE_FONT_SIZE,
        label: LABEL_FONT_SIZE,
        subLabel: SUBLABEL_FONT_SIZE,
        icon: ICON_SIZE,
        iconStroke: ICON_STROKE,
        iconValueGap: ICON_VALUE_GAP,
      },
      colors: {
        primary: TEXT_PRIMARY,
        secondary: TEXT_SECONDARY,
        label: TEXT_LABEL,
      },
      fonts: {
        primary: PRIMARY_FONT_FAMILY,
        secondary: SECONDARY_FONT_FAMILY,
      },
      showCamera: SHOW_CAMERA,
      showLens: SHOW_LENS,
      showFocal: SHOW_FOCAL,
      exposureComp: EXPOSURE_COMP,
      histogramStyle: HISTOGRAM_STYLE,
      histogramPrecision: HISTOGRAM_PRECISION,
      histogramOpacity: HISTOGRAM_OPACITY,
      histogramSmoothing: HISTOGRAM_SMOOTHING,
      isDark: WALL_COLOR_DARK,
    };

    switch (seg.kind) {
      case 'camera':    renderCamera(ctx, ctxOpts); break;
      case 'aperture':  renderAperture(ctx, ctxOpts); break;
      case 'shutter':   renderShutter(ctx, ctxOpts); break;
      case 'iso':       renderIso(ctx, ctxOpts); break;
      case 'ev':        renderEv(ctx, ctxOpts); break;
      case 'histogram': renderHistogram(ctx, ctxOpts); break;
    }

    // 인접한 EXIF segment 쌍 사이에만 미세한 vertical divider.
    // (좌측 그룹과 histogram 사이의 빈 공간엔 divider 없음)
    const nextSeg = segments[idx + 1];
    if (nextSeg && EXIF_KINDS.includes(seg.kind) && EXIF_KINDS.includes(nextSeg.kind)) {
      const nextX = segXs[idx + 1];
      const dividerX = (segX + segW + nextX) / 2;
      ctx.strokeStyle = DIVIDER_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(dividerX, segY + segH * 0.15);
      ctx.lineTo(dividerX, segY + segH * 0.85);
      ctx.stroke();
    }
  });

  return canvas;
};

// ────────────────────────────────────────────────────────────────
// Segment system
// ────────────────────────────────────────────────────────────────

type SegmentKind = 'camera' | 'aperture' | 'shutter' | 'iso' | 'ev' | 'histogram';
type Segment = { kind: SegmentKind; weight: number };

interface SegmentContext {
  x: number;
  y: number;
  w: number;
  h: number;
  photo: Photo;
  sizes: {
    primary: number;
    secondary: number;
    value: number;
    label: number;
    subLabel: number;
    icon: number;
    iconStroke: number;
    iconValueGap: number;
  };
  colors: {
    primary: string;
    secondary: string;
    label: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
  showCamera: boolean;
  showLens: boolean;
  showFocal: boolean;
  exposureComp: string;
  histogramStyle: HistogramStyle;
  histogramPrecision: 'fast' | 'precise';
  histogramOpacity: number;
  histogramSmoothing: number;
  isDark: boolean;
}

// ────── Camera segment ──────
// Left-aligned text cluster: camera/lens/focal stacked vertically.
// Only the camera row has an icon — lens and focal-length rows align
// their text to the same X as the camera text so they get extra room.
function renderCamera(ctx: CanvasRenderingContext2D, c: SegmentContext): void {
  const { x, y, w, h, photo, sizes, colors, fonts } = c;

  // Compute how many rows we'll show — drives vertical centering
  const rows: { text: string; weight: 'primary' | 'secondary' | 'tertiary'; icon?: 'camera' | null }[] = [];
  if (c.showCamera) {
    const cam = [photo.make, photo.model].filter(Boolean).join(' ').trim();
    if (cam) rows.push({ text: cam, weight: 'primary', icon: 'camera' });
  }
  if (c.showLens && photo.lensModel) {
    rows.push({ text: photo.lensModel, weight: 'secondary' });
  }
  if (c.showFocal && photo.focalLength) {
    rows.push({ text: photo.focalLength, weight: 'tertiary' });
  }
  if (rows.length === 0) return;

  // Vertical placement
  const rowGap = sizes.secondary * 0.45;
  const rowHeights = rows.map(r =>
    r.weight === 'primary' ? sizes.primary
      : r.weight === 'secondary' ? sizes.secondary
      : sizes.secondary * 0.85
  );
  const totalRowsHeight = rowHeights.reduce((s, n) => s + n, 0) + rowGap * (rows.length - 1);
  const startY = y + (h - totalRowsHeight) / 2;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Where text begins — same X for every row so non-camera rows
  // reclaim the icon's width as additional text space.
  // 아이콘↔텍스트 간격은 EXIF의 세로 stack 간격(iconValueGap)과 무관하게
  // 카메라 텍스트 크기 비례 고정.
  const textStartX = x + sizes.icon * 0.5 + sizes.icon * 0.6 + sizes.primary * 0.5;

  let runningY = startY;
  rows.forEach((row, idx) => {
    const rowH = rowHeights[idx];
    const rowCenterY = runningY + rowH / 2;

    if (row.icon) {
      // Only the camera row draws an icon
      const iconCx = x + sizes.icon * 0.5;
      drawIcon(ctx, row.icon, {
        cx: iconCx,
        cy: rowCenterY,
        size: sizes.icon * 0.85,
        color: colors.primary,
        strokeWidth: sizes.iconStroke,
      });
    }

    const fontSize =
      row.weight === 'primary' ? sizes.primary :
      row.weight === 'secondary' ? sizes.secondary :
      sizes.secondary * 0.85;
    const fontWeight = row.weight === 'primary' ? 600 : 400;
    ctx.fillStyle = row.weight === 'primary' ? colors.primary : colors.secondary;
    const fontFamily = row.weight === 'primary' ? fonts.primary : fonts.secondary;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const maxTextWidth = x + w - textStartX - sizes.primary * 0.3;
    ctx.fillText(truncate(ctx, row.text, maxTextWidth), textStartX, rowCenterY);

    runningY += rowH + rowGap;
  });
}

// ────── Stat segments (aperture / shutter / iso) ──────
// Icon on top, value below. Aligned to a shared baseline across columns
// so the values line up horizontally regardless of which icon is used.
//
// Vertical layout inside the segment:
//   icon center  → at 38% from the top
//   value center → at 70% from the top
//
// Same percentages used by all stat columns so APERTURE/SHUTTER/ISO
// values are perfectly aligned.
function renderStat(
  ctx: CanvasRenderingContext2D,
  c: SegmentContext,
  iconRenderer: (cx: number, cy: number) => void,
  value: string
): void {
  const { x, y, w, h, sizes, colors, fonts } = c;
  const cx = x + w / 2;

  // 아이콘 + 값을 (아이콘 위, 값 아래) 수직 스택으로 그리고 segment 세로 중앙에 정렬.
  // 두 요소 사이 간격은 sizes.iconValueGap (= 사용자 설정 EXIF_ICON_GAP).
  const stackH = sizes.icon + sizes.iconValueGap + sizes.value;
  const stackTop = y + (h - stackH) / 2;
  const iconCy = stackTop + sizes.icon / 2;
  const valueCy = stackTop + sizes.icon + sizes.iconValueGap + sizes.value / 2;

  iconRenderer(cx, iconCy);

  ctx.fillStyle = colors.primary;
  ctx.font = `500 ${sizes.value}px ${fonts.secondary}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, cx, valueCy);
}

function renderAperture(ctx: CanvasRenderingContext2D, c: SegmentContext): void {
  renderStat(
    ctx, c,
    (cx, cy) => drawIcon(ctx, 'aperture', { cx, cy, size: c.sizes.icon, color: c.colors.primary, strokeWidth: c.sizes.iconStroke }),
    c.photo.fNumber || '—'
  );
}

function renderShutter(ctx: CanvasRenderingContext2D, c: SegmentContext): void {
  renderStat(
    ctx, c,
    (cx, cy) => drawIcon(ctx, 'clock', { cx, cy, size: c.sizes.icon, color: c.colors.primary, strokeWidth: c.sizes.iconStroke }),
    c.photo.exposureTime || '—'
  );
}

function renderIso(ctx: CanvasRenderingContext2D, c: SegmentContext): void {
  const isoVal = c.photo.iso?.replace(/^ISO\s*/i, '') || '—';
  renderStat(
    ctx, c,
    (cx, cy) => drawIsoIcon(ctx, cx, cy, c.sizes.icon * 1.1, c.colors.primary, c.sizes.iconStroke),
    isoVal
  );
}

// ────── EV segment — number on top, scale below ──────
function renderEv(ctx: CanvasRenderingContext2D, c: SegmentContext): void {
  const { x, y, w, h, sizes, colors, fonts } = c;
  const cx = x + w / 2;
  const value = c.exposureComp || '0';

  // Stack: value, label, scale
  const valueH = sizes.value;
  const labelH = sizes.label;
  const scaleH = sizes.label * 1.4;
  // EV는 3단 stack(value / label / scale)이라 사용자 EXIF_ICON_GAP 영향에서 분리.
  // label 크기 비례 작은 고정값 사용 — 다단 스택이 strap 높이 안에 안정적으로 들어감.
  const gap = sizes.label * 0.4;
  const totalH = valueH + gap + labelH + gap + scaleH;
  const startY = y + (h - totalH) / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = colors.primary;
  ctx.font = `500 ${sizes.value}px ${fonts.secondary}`;
  const valueCy = startY + valueH / 2;
  ctx.fillText(value, cx, valueCy);

  ctx.fillStyle = colors.label;
  ctx.font = `500 ${sizes.label}px ${fonts.secondary}`;
  const labelCy = valueCy + valueH / 2 + gap + labelH / 2;
  ctx.fillText('EV', cx, labelCy);

  // Scale: -3 .. +3 horizontal, with dot indicator
  const scaleY = labelCy + labelH / 2 + gap + scaleH / 2;
  const scaleWidth = Math.min(w * 0.7, sizes.value * 6);
  const scaleLeft = cx - scaleWidth / 2;

  ctx.strokeStyle = colors.label;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(scaleLeft, scaleY);
  ctx.lineTo(scaleLeft + scaleWidth, scaleY);
  ctx.stroke();

  const ticks = ['-3', '-2', '-1', '', '+1', '+2', '+3'];
  ctx.fillStyle = colors.label;
  ctx.font = `400 ${sizes.subLabel}px ${fonts.secondary}`;
  ticks.forEach((t, i) => {
    const tx = scaleLeft + (scaleWidth * i) / (ticks.length - 1);
    ctx.beginPath();
    ctx.moveTo(tx, scaleY - sizes.label * 0.25);
    ctx.lineTo(tx, scaleY + sizes.label * 0.25);
    ctx.stroke();
    if (t) ctx.fillText(t, tx, scaleY + sizes.label * 0.7);
  });

  const evValue = parseFloat(value.replace(/[^\-\d.+]/g, '')) || 0;
  const clampedEv = Math.max(-3, Math.min(3, evValue));
  const indicatorX = scaleLeft + (scaleWidth * (clampedEv + 3)) / 6;
  ctx.fillStyle = colors.primary;
  ctx.beginPath();
  ctx.arc(indicatorX, scaleY, Math.max(2, sizes.label * 0.25), 0, Math.PI * 2);
  ctx.fill();
}

// ────── Histogram segment ──────
function renderHistogram(ctx: CanvasRenderingContext2D, c: SegmentContext): void {
  const { x, y, w, h, photo } = c;
  // 마진은 EXIF_ICON_GAP과 무관하게 segment 높이 비례 고정.
  // (이전엔 sizes.iconValueGap 사용 → 아이콘-값 간격 키우면 히스토그램이 줄어드는 부작용)
  const margin = h * 0.08;
  const histogram = computeHistogram(photo, { precision: c.histogramPrecision });
  drawHistogram(ctx, histogram, {
    x: x + margin,
    y: y + margin,
    width: w - margin * 2,
    height: h - margin * 2,
    style: c.histogramStyle,
    channels: 'rgb',
    darkMode: c.isDark,
    smoothing: c.histogramSmoothing,
    opacity: c.histogramOpacity,
    showGrid: true,
    showClipping: true,
  });
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
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

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  stroke: string, lineWidth: number
): void {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
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
  ctx.stroke();
  ctx.restore();
}

export { MODERN_OVERLAY_FUNC, MODERN_OVERLAY_OPTIONS };