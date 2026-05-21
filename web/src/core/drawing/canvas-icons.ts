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

/**
 * Vector icon module for canvas themes.
 *
 * Icons are stored as SVG path strings designed on a 24×24 viewbox
 * (Lucide-compatible). drawIcon() rasterizes them to a canvas at any
 * size/color/stroke width while preserving crispness.
 *
 * Why not PNG icons? PNGs would require shipping a folder of files
 * and would only render at one color. SVG paths render at any color
 * and any resolution for free, and they're small enough to inline.
 */

export type IconName =
  | 'camera'
  | 'lens'
  | 'aperture'
  | 'clock'
  | 'iso'
  | 'exposure'
  | 'ruler'
  | 'film';

/**
 * Each icon is a list of "sub-paths". Each sub-path has either a stroked
 * line (most icons are line-style for the modern look in the reference
 * image) or a filled shape.
 *
 * Coordinates are on a 24×24 grid — drawIcon scales them to any size.
 */
type SubPath = {
  /** SVG path d-attribute */
  d: string;
  /** Render style */
  mode: 'stroke' | 'fill';
};

const ICONS: Record<IconName, SubPath[]> = {
  // Camera body with lens circle on top — like the ⌂📷 in the reference
  camera: [
    {
      mode: 'stroke',
      d: 'M3 7h3l2-3h8l2 3h3v12H3z',
    },
    {
      mode: 'stroke',
      d: 'M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    },
  ],

  // Aperture iris — 표준 회전식 조리개 패턴.
  // 외곽 원 + 6각형 중앙 구멍 + 각 꼭짓점에서 인접 변 방향으로 외곽까지 뻗는 6장의 블레이드 라인.
  // 좌표는 24x24 viewBox, 중심 (12,12), 외곽반지름 10, 내부 6각형 외접반지름 4.5에서 계산.
  aperture: [
    // 외곽 원
    { mode: 'stroke', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z' },
    // 내부 6각형 (블레이드들이 만드는 가운데 구멍)
    { mode: 'stroke', d: 'M 12 7.5 L 8.1 9.75 L 8.1 14.25 L 12 16.5 L 15.9 14.25 L 15.9 9.75 Z' },
    // 6장의 블레이드 (각 꼭짓점 → 외곽 원, 인접 변 방향으로 연장)
    { mode: 'stroke', d: 'M 12 7.5 L 2.08 13.23' },
    { mode: 'stroke', d: 'M 8.1 9.75 L 8.1 21.21' },
    { mode: 'stroke', d: 'M 8.1 14.25 L 18.03 19.98' },
    { mode: 'stroke', d: 'M 12 16.5 L 21.92 10.77' },
    { mode: 'stroke', d: 'M 15.9 14.25 L 15.9 2.79' },
    { mode: 'stroke', d: 'M 15.9 9.75 L 5.97 4.02' },
  ],

  // Clock with hands at roughly 10:10
  clock: [
    { mode: 'stroke', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z' },
    { mode: 'stroke', d: 'M12 7 L12 12 L16 14' },
  ],

  // ISO — square frame with "ISO" letters; the letters are rendered
  // separately by drawIcon when this name is used (caller knows context)
  iso: [
    { mode: 'stroke', d: 'M3 5 H21 V19 H3 Z' },
  ],

  // Lens — concentric circles
  lens: [
    { mode: 'stroke', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z' },
    { mode: 'stroke', d: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z' },
    { mode: 'fill', d: 'M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z' },
  ],

  // Exposure compensation — horizontal scale with notches
  exposure: [
    { mode: 'stroke', d: 'M3 12 H21' },
    { mode: 'stroke', d: 'M6 9 V15' },
    { mode: 'stroke', d: 'M9 10 V14' },
    { mode: 'stroke', d: 'M12 8 V16' },
    { mode: 'stroke', d: 'M15 10 V14' },
    { mode: 'stroke', d: 'M18 9 V15' },
  ],

  // Focal length — side view of a camera lens (실제 렌즈를 옆에서 본 모습)
  // 좌측 마운트(좁음) → 중앙 배럴 → 우측 후드(넓음). 다른 아이콘과 동일하게 y=2~22 영역 사용.
  ruler: [
    // 외곽 실루엣 (좌측 마운트 ↑→ 중앙 배럴 ↑→ 우측 후드 ↑→ 그리고 대칭으로 아래로)
    // 좌측 마운트 (작은 사각): x=2~5, y=8~16
    // 중앙 배럴 (큰 사각): x=5~17, y=5~19
    // 우측 후드 (조금 더 큰 사각): x=17~22, y=4~20
    {
      mode: 'stroke',
      d: 'M2 8 H5 V5 H17 V4 H22 V20 H17 V19 H5 V16 H2 Z',
    },
    // 중앙에 줌 링 표시 (얇은 수직선 2개)
    { mode: 'stroke', d: 'M9 5 V19' },
    { mode: 'stroke', d: 'M13 5 V19' },
  ],

  // Film strip — for film-look themes
  film: [
    { mode: 'stroke', d: 'M3 5 H21 V19 H3 Z' },
    { mode: 'fill', d: 'M5 7 H7 V9 H5 Z' },
    { mode: 'fill', d: 'M5 11 H7 V13 H5 Z' },
    { mode: 'fill', d: 'M5 15 H7 V17 H5 Z' },
    { mode: 'fill', d: 'M17 7 H19 V9 H17 Z' },
    { mode: 'fill', d: 'M17 11 H19 V13 H17 Z' },
    { mode: 'fill', d: 'M17 15 H19 V17 H17 Z' },
  ],
};

export interface DrawIconOptions {
  /** Center X in canvas pixels */
  cx: number;
  /** Center Y in canvas pixels */
  cy: number;
  /** Icon visual size (the 24×24 box is scaled to this) */
  size: number;
  /** Stroke color and line color */
  color: string;
  /** Stroke width in canvas pixels (independent of icon size) */
  strokeWidth?: number;
  /** Opacity 0..1 */
  opacity?: number;
}

/**
 * Draw a vector icon onto a 2D context.
 *
 * The icon is rendered centered at (cx, cy) and scaled to `size` pixels
 * on its longest edge. Stroke widths are NOT scaled with size — they
 * stay at the requested `strokeWidth` so icons look consistent at any
 * size (a "hairline-style" approach).
 */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  options: DrawIconOptions
): void {
  const { cx, cy, size, color, strokeWidth = 2, opacity = 1 } = options;
  const subpaths = ICONS[name];
  if (!subpaths) return;

  const scale = size / 24;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(scale, scale);
  // Counter-scale the stroke width so it stays at the requested pixel size
  ctx.lineWidth = strokeWidth / scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  for (const sp of subpaths) {
    const path = new Path2D(sp.d);
    if (sp.mode === 'stroke') {
      ctx.stroke(path);
    } else {
      ctx.fill(path);
    }
  }

  ctx.restore();
}

/**
 * Convenience: draw an "ISO" icon — a rounded rectangle with the
 * letters "ISO" inside. Used by themes that show the ISO value next
 * to its own labeled icon.
 */
export function drawIsoIcon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  strokeWidth = 2,
  opacity = 1
): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = 'round';

  const w = size;
  const h = size * 0.7;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const r = 4;

  // Rounded rectangle frame
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
  ctx.stroke();

  // "ISO" letters centered
  ctx.font = `700 ${h * 0.55}px Barlow, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ISO', cx, cy);

  ctx.restore();
}