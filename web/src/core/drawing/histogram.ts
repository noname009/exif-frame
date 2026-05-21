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

import Photo from '../photo';

/**
 * Histogram bin data for a single channel.
 */
export type HistogramData = {
  r: Uint32Array;
  g: Uint32Array;
  b: Uint32Array;
  luma: Uint32Array;
  total: number;
};

/**
 * Optional configuration for histogram computation.
 */
export interface ComputeHistogramOptions {
  /**
   * Sampling strategy.
   *  - 'fast' (default): downsample to ~512px on the long edge.
   *    Runs in < 30ms on a 24MP image but slightly under-counts
   *    extreme bins (0 and 255) because the bilinear downscale
   *    averages neighbouring pixels.
   *  - 'precise': scan the full-resolution image. ~10x slower
   *    (a few hundred ms on 24MP) but gives clipping counts that
   *    match what Lightroom shows in its export module.
   */
  precision?: 'fast' | 'precise';
  /** Override the long-edge target when precision is 'fast' */
  sampleSize?: number;
}

/**
 * sRGB → linear-light conversion.
 *
 * Required for an accurate luma channel because sRGB is gamma-encoded:
 * doing a weighted average directly on sRGB values yields a brightness
 * curve that doesn't match how the eye perceives luminance.
 *
 * The IEC 61966-2-1 piecewise transfer function:
 *   c_linear = c/12.92                          if c <= 0.04045
 *            = ((c + 0.055) / 1.055) ^ 2.4      otherwise
 */
const srgbToLinearLut = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  srgbToLinearLut[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Inverse transfer: linear-light → sRGB.
 * Used after computing relative luminance to map back to the 0..255
 * encoded space that histograms display.
 */
function linearToSrgb(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/**
 * Compute an RGB + Luma histogram from a photo.
 *
 * Luma uses BT.709 weights on linearized sRGB values, then re-encodes
 * with the sRGB transfer function. This matches the luma channel shown
 * by Lightroom and Photoshop far more closely than the older approach
 * of doing a BT.601 weighted average on raw sRGB bytes.
 *
 * RGB channels are counted on the raw sRGB-encoded bytes — that's
 * what every histogram tool does and matches user expectations.
 */
export function computeHistogram(photo: Photo, options: ComputeHistogramOptions | number = {}): HistogramData {
  // Backwards-compat: previous signature was (photo, sampleSize=512)
  const opts: ComputeHistogramOptions =
    typeof options === 'number' ? { precision: 'fast', sampleSize: options } : options;
  const precision = opts.precision ?? 'fast';
  const sampleSize = opts.sampleSize ?? 512;

  const { image } = photo;

  let w: number;
  let h: number;
  if (precision === 'precise') {
    w = image.width;
    h = image.height;
  } else {
    const scale = sampleSize / Math.max(image.width, image.height);
    w = Math.max(1, Math.round(image.width * scale));
    h = Math.max(1, Math.round(image.height * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  // Disable smoothing in precise mode so we measure actual pixels,
  // not bilinear-blended approximations
  if (precision === 'precise') {
    ctx.imageSmoothingEnabled = false;
  }
  ctx.drawImage(image, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const r = new Uint32Array(256);
  const g = new Uint32Array(256);
  const b = new Uint32Array(256);
  const luma = new Uint32Array(256);

  for (let i = 0; i < data.length; i += 4) {
    const R = data[i];
    const G = data[i + 1];
    const B = data[i + 2];

    // RGB: count the sRGB-encoded bytes directly
    r[R]++;
    g[G]++;
    b[B]++;

    // Luma: linearize → BT.709 weighted average → re-encode → bucket
    const Rlin = srgbToLinearLut[R];
    const Glin = srgbToLinearLut[G];
    const Blin = srgbToLinearLut[B];
    const Ylin = 0.2126 * Rlin + 0.7152 * Glin + 0.0722 * Blin;
    const Ysrgb = linearToSrgb(Ylin);
    // Round (not truncate) so the distribution is symmetric and the
    // brightest values land in bin 255, not 254
    const bin = Math.min(255, Math.max(0, Math.round(Ysrgb * 255)));
    luma[bin]++;
  }

  return { r, g, b, luma, total: w * h };
}

/** Visualization style — completely different visual languages */
export type HistogramStyle =
  | 'classic'   // smooth curves + gradient fills + clipping indicators
  | 'minimal'   // luma only, single thin line, no chrome
  | 'bars'      // 256 vertical bars, digital precision
  | 'waveform'  // flowing left-to-right with glow, audio-visualizer feel
  | 'comic'     // bold outline + halftone fill, manga-style
  | 'neon'      // dark panel with neon glow, cyberpunk
  | 'pastel'    // soft fills with rounded caps, cozy
  | 'ridge';    // offset ridge plot, Joy Division Unknown Pleasures vibe

export type HistogramChannels = 'rgb' | 'luma' | 'rgb+luma';

export interface DrawHistogramOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  style?: HistogramStyle;
  channels?: HistogramChannels;
  darkMode?: boolean;
  smoothing?: number;
  opacity?: number;
  showGrid?: boolean;
  showClipping?: boolean;
}

// ──── Shared helpers ────

function smoothBins(bins: Uint32Array, passes: number): Float32Array {
  let current = new Float32Array(bins.length);
  for (let i = 0; i < bins.length; i++) current[i] = bins[i];
  for (let p = 0; p < passes; p++) {
    const next = new Float32Array(bins.length);
    for (let i = 0; i < bins.length; i++) {
      const a = current[Math.max(0, i - 1)];
      const c = current[i];
      const e = current[Math.min(bins.length - 1, i + 1)];
      next[i] = (a + c * 2 + e) / 4;
    }
    current = next;
  }
  return current;
}

function findMax(arrays: Float32Array[]): number {
  let max = 0;
  for (const arr of arrays) {
    const sorted = Array.from(arr).sort((a, b) => b - a);
    const top = sorted[Math.floor(sorted.length * 0.01)] ?? sorted[0];
    if (top > max) max = top;
  }
  return max || 1;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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
}

function strokePathOpen(
  ctx: CanvasRenderingContext2D, bins: Float32Array, max: number,
  x: number, y: number, width: number, height: number, smoothing: number
): void {
  ctx.beginPath();
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 256; i++) {
    pts.push({ x: x + (i / 255) * width, y: y + height - Math.min(1, bins[i] / max) * height });
  }
  ctx.moveTo(pts[0].x, pts[0].y);
  if (smoothing <= 0) {
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  } else {
    const tension = 0.5 * smoothing;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1], p1 = pts[i], p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) * tension * 0.166;
      const cp1y = p1.y + (p2.y - p0.y) * tension * 0.166;
      const cp2x = p2.x - (p3.x - p1.x) * tension * 0.166;
      const cp2y = p2.y - (p3.y - p1.y) * tension * 0.166;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }
}

function fillPathClosed(
  ctx: CanvasRenderingContext2D, bins: Float32Array, max: number,
  x: number, y: number, width: number, height: number, smoothing: number
): void {
  ctx.beginPath();
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 256; i++) {
    pts.push({ x: x + (i / 255) * width, y: y + height - Math.min(1, bins[i] / max) * height });
  }
  ctx.moveTo(pts[0].x, y + height);
  ctx.lineTo(pts[0].x, pts[0].y);
  if (smoothing <= 0) {
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  } else {
    const tension = 0.5 * smoothing;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1], p1 = pts[i], p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) * tension * 0.166;
      const cp1y = p1.y + (p2.y - p0.y) * tension * 0.166;
      const cp2x = p2.x - (p3.x - p1.x) * tension * 0.166;
      const cp2y = p2.y - (p3.y - p1.y) * tension * 0.166;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
}

type Channel = { bins: Float32Array; fillBase: string; stroke: string };

function buildChannels(
  histogram: HistogramData, channels: HistogramChannels, opacity: number, smoothPasses = 2
): Channel[] {
  const list: Channel[] = [];
  if (channels === 'rgb' || channels === 'rgb+luma') {
    list.push(
      { bins: smoothBins(histogram.r, smoothPasses), fillBase: `rgba(255, 70, 70, ${opacity})`, stroke: 'rgba(255, 90, 90, 1)' },
      { bins: smoothBins(histogram.g, smoothPasses), fillBase: `rgba(70, 220, 110, ${opacity})`, stroke: 'rgba(90, 230, 130, 1)' },
      { bins: smoothBins(histogram.b, smoothPasses), fillBase: `rgba(80, 130, 255, ${opacity})`, stroke: 'rgba(100, 150, 255, 1)' }
    );
  }
  if (channels === 'luma' || channels === 'rgb+luma') {
    list.push({
      bins: smoothBins(histogram.luma, smoothPasses),
      fillBase: `rgba(240, 240, 240, ${opacity * 1.1})`,
      stroke: 'rgba(255, 255, 255, 0.95)',
    });
  }
  return list;
}

function drawClipping(
  ctx: CanvasRenderingContext2D, histogram: HistogramData,
  x: number, y: number, width: number, height: number
): void {
  const shadowPct = histogram.luma[0] / histogram.total;
  const highlightPct = histogram.luma[255] / histogram.total;
  const threshold = 0.005, w = 4;
  if (shadowPct > threshold) {
    const intensity = Math.min(1, shadowPct / 0.05);
    ctx.fillStyle = `rgba(80, 130, 255, ${0.4 + intensity * 0.5})`;
    ctx.fillRect(x + 2, y + 4, w, height - 8);
  }
  if (highlightPct > threshold) {
    const intensity = Math.min(1, highlightPct / 0.05);
    ctx.fillStyle = `rgba(255, 90, 90, ${0.4 + intensity * 0.5})`;
    ctx.fillRect(x + width - 2 - w, y + 4, w, height - 8);
  }
}

// ──── STYLE: classic ────
function drawClassic(ctx: CanvasRenderingContext2D, histogram: HistogramData, o: Required<DrawHistogramOptions>): void {
  const { x, y, width, height, darkMode, smoothing, opacity, showGrid, showClipping } = o;
  const bg = darkMode ? 'rgba(20,20,22,0.95)' : 'rgba(28,28,32,0.97)';
  const border = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)';
  const grid = 'rgba(255,255,255,0.08)';
  const radius = 10;

  ctx.save();
  roundRectPath(ctx, x, y, width, height, radius); ctx.fillStyle = bg; ctx.fill();
  roundRectPath(ctx, x, y, width, height, radius); ctx.clip();

  if (showGrid) {
    ctx.strokeStyle = grid; ctx.lineWidth = 1;
    for (const t of [0.25, 0.5, 0.75]) {
      const gx = x + width * t;
      ctx.beginPath(); ctx.moveTo(gx, y + 4); ctx.lineTo(gx, y + height - 4); ctx.stroke();
    }
  }

  const list = buildChannels(histogram, o.channels, opacity);
  const max = findMax(list.map(c => c.bins));

  ctx.globalCompositeOperation = 'lighter';
  for (const ch of list) {
    const g = ctx.createLinearGradient(0, y, 0, y + height);
    g.addColorStop(0, ch.fillBase.replace(/,\s*[\d.]+\)$/, ', 0)'));
    g.addColorStop(0.6, ch.fillBase);
    g.addColorStop(1, ch.fillBase);
    ctx.fillStyle = g;
    fillPathClosed(ctx, ch.bins, max, x, y, width, height, smoothing); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const ch of list) {
    ctx.strokeStyle = ch.stroke; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    strokePathOpen(ctx, ch.bins, max, x, y, width, height, smoothing); ctx.stroke();
  }
  if (showClipping) drawClipping(ctx, histogram, x, y, width, height);
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = border; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

// ──── STYLE: minimal ────
function drawMinimal(ctx: CanvasRenderingContext2D, histogram: HistogramData, o: Required<DrawHistogramOptions>): void {
  const { x, y, width, height, darkMode, smoothing } = o;
  const line = darkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)';
  const fill = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  ctx.save();
  const bins = smoothBins(histogram.luma, 3);
  const max = findMax([bins]);

  ctx.fillStyle = fill;
  fillPathClosed(ctx, bins, max, x, y, width, height, smoothing); ctx.fill();

  ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  strokePathOpen(ctx, bins, max, x, y, width, height, smoothing); ctx.stroke();

  ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y + height); ctx.lineTo(x + width, y + height); ctx.stroke();
  ctx.restore();
}

// ──── STYLE: bars ────
function drawBars(ctx: CanvasRenderingContext2D, histogram: HistogramData, o: Required<DrawHistogramOptions>): void {
  const { x, y, width, height, darkMode, opacity, showClipping } = o;
  const bg = darkMode ? 'rgba(15,15,18,0.95)' : 'rgba(245,245,247,0.9)';
  const border = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.15)';

  ctx.save();
  roundRectPath(ctx, x, y, width, height, 6); ctx.fillStyle = bg; ctx.fill();
  roundRectPath(ctx, x, y, width, height, 6); ctx.clip();

  const list = buildChannels(histogram, o.channels, opacity, 0);
  const max = findMax(list.map(c => c.bins));
  const barWidth = width / 256;

  ctx.globalCompositeOperation = 'lighter';
  for (const ch of list) {
    ctx.fillStyle = ch.fillBase;
    for (let i = 0; i < 256; i++) {
      const h = Math.min(1, ch.bins[i] / max) * height;
      ctx.fillRect(x + i * barWidth, y + height - h, Math.max(1, barWidth - 0.3), h);
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  if (showClipping) drawClipping(ctx, histogram, x, y, width, height);
  ctx.restore();

  ctx.save();
  roundRectPath(ctx, x, y, width, height, 6);
  ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

// ──── STYLE: waveform ────
function drawWaveform(ctx: CanvasRenderingContext2D, histogram: HistogramData, o: Required<DrawHistogramOptions>): void {
  const { x, y, width, height, smoothing } = o;

  ctx.save();
  const bg = ctx.createLinearGradient(0, y, 0, y + height);
  bg.addColorStop(0, 'rgba(8, 8, 20, 0.98)');
  bg.addColorStop(1, 'rgba(18, 12, 30, 0.98)');
  roundRectPath(ctx, x, y, width, height, 8); ctx.fillStyle = bg; ctx.fill();
  roundRectPath(ctx, x, y, width, height, 8); ctx.clip();

  const list = buildChannels(histogram, o.channels, 0.35);
  const max = findMax(list.map(c => c.bins));

  ctx.globalCompositeOperation = 'lighter';
  for (const ch of list) {
    const g = ctx.createLinearGradient(0, y, 0, y + height);
    g.addColorStop(0, ch.stroke.replace('1)', '0.5)'));
    g.addColorStop(1, ch.fillBase.replace(/,\s*[\d.]+\)$/, ', 0.05)'));
    ctx.fillStyle = g;
    fillPathClosed(ctx, ch.bins, max, x, y, width, height, smoothing); ctx.fill();
  }

  for (const ch of list) {
    ctx.shadowColor = ch.stroke;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = ch.stroke;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    strokePathOpen(ctx, ch.bins, max, x, y, width, height, smoothing); ctx.stroke();
    ctx.shadowBlur = 24;
    ctx.lineWidth = 1;
    strokePathOpen(ctx, ch.bins, max, x, y, width, height, smoothing); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

// ──── STYLE: comic ────
function drawComic(ctx: CanvasRenderingContext2D, histogram: HistogramData, o: Required<DrawHistogramOptions>): void {
  const { x, y, width, height, darkMode, smoothing } = o;
  const paper = darkMode ? '#1a1a1a' : '#f5f0e6';
  const ink = darkMode ? '#f0f0f0' : '#0a0a0a';

  ctx.save();
  ctx.fillStyle = paper;
  ctx.fillRect(x, y, width, height);
  ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();

  const list = buildChannels(histogram, o.channels === 'rgb+luma' ? 'rgb' : o.channels, 1);
  const max = findMax(list.map(c => c.bins));

  const dotSpacing = 8;
  const dotMaxRadius = 3;
  list.forEach((ch, idx) => {
    const phase = idx * (dotSpacing / 3);
    ctx.fillStyle = ch.fillBase.replace(/[\d.]+\)$/, '0.85)');
    for (let py = y + phase; py < y + height; py += dotSpacing) {
      for (let px = x + (idx * 2.5); px < x + width; px += dotSpacing) {
        const binIdx = Math.floor(((px - x) / width) * 255);
        const heightRatio = Math.min(1, ch.bins[binIdx] / max);
        const curveY = y + height - heightRatio * height;
        if (py > curveY) {
          const r = Math.min(dotMaxRadius, (py - curveY) / (height * 0.5) * dotMaxRadius + 0.5);
          ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  });

  for (const ch of list) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    strokePathOpen(ctx, ch.bins, max, x, y, width, height, smoothing); ctx.stroke();
  }

  ctx.strokeStyle = ink; ctx.lineWidth = 4;
  ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
  ctx.restore();
}

// ──── STYLE: neon ────
function drawNeon(ctx: CanvasRenderingContext2D, histogram: HistogramData, o: Required<DrawHistogramOptions>): void {
  const { x, y, width, height, smoothing } = o;

  ctx.save();
  ctx.fillStyle = '#050510';
  roundRectPath(ctx, x, y, width, height, 4); ctx.fill();

  ctx.save();
  roundRectPath(ctx, x, y, width, height, 4); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let sy = y; sy < y + height; sy += 3) {
    ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x + width, sy); ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 0, 255, 0.08)';
  for (let i = 1; i < 8; i++) {
    const gx = x + (i / 8) * width;
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + height); ctx.stroke();
  }
  for (let i = 1; i < 4; i++) {
    const gy = y + (i / 4) * height;
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + width, gy); ctx.stroke();
  }

  const list = buildChannels(histogram, o.channels, 0.2);
  const max = findMax(list.map(c => c.bins));

  ctx.globalCompositeOperation = 'screen';
  for (const ch of list) {
    ctx.shadowColor = ch.stroke;
    ctx.strokeStyle = ch.stroke;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    [{ blur: 28, width: 1 }, { blur: 14, width: 2 }, { blur: 4, width: 2.5 }].forEach(({ blur, width: lw }) => {
      ctx.shadowBlur = blur; ctx.lineWidth = lw;
      strokePathOpen(ctx, ch.bins, max, x, y, width, height, smoothing); ctx.stroke();
    });
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  roundRectPath(ctx, x, y, width, height, 4);
  ctx.strokeStyle = 'rgba(255, 0, 200, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// ──── STYLE: pastel ────
function drawPastel(ctx: CanvasRenderingContext2D, histogram: HistogramData, o: Required<DrawHistogramOptions>): void {
  const { x, y, width, height, darkMode, smoothing } = o;
  const bg = darkMode ? '#2a2530' : '#fef6ef';
  const accent = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';

  const pastelColors = o.channels === 'luma'
    ? [{ fill: darkMode ? 'rgba(255,220,200,0.5)' : 'rgba(180,140,200,0.55)', stroke: darkMode ? 'rgba(255,220,200,1)' : 'rgba(140,90,170,1)' }]
    : [
        { fill: 'rgba(255, 170, 170, 0.55)', stroke: 'rgba(230, 110, 110, 1)' },
        { fill: 'rgba(170, 220, 180, 0.55)', stroke: 'rgba(100, 180, 130, 1)' },
        { fill: 'rgba(170, 200, 250, 0.55)', stroke: 'rgba(110, 150, 230, 1)' },
      ];

  ctx.save();
  roundRectPath(ctx, x, y, width, height, 16);
  ctx.fillStyle = bg; ctx.fill();
  roundRectPath(ctx, x, y, width, height, 16); ctx.clip();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  ctx.setLineDash([1, 6]);
  ctx.beginPath(); ctx.moveTo(x + 8, y + height - 6); ctx.lineTo(x + width - 8, y + height - 6); ctx.stroke();
  ctx.setLineDash([]);

  const channelData =
    o.channels === 'luma' ? [histogram.luma] :
    o.channels === 'rgb' ? [histogram.r, histogram.g, histogram.b] :
    [histogram.r, histogram.g, histogram.b, histogram.luma];

  const smoothed = channelData.map(c => smoothBins(c, 3));
  const max = findMax(smoothed);

  smoothed.forEach((bins, idx) => {
    const color = pastelColors[idx % pastelColors.length];
    ctx.fillStyle = color.fill;
    fillPathClosed(ctx, bins, max, x + 6, y + 6, width - 12, height - 18, smoothing);
    ctx.fill();
    ctx.strokeStyle = color.stroke;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokePathOpen(ctx, bins, max, x + 6, y + 6, width - 12, height - 18, smoothing);
    ctx.stroke();
  });
  ctx.restore();
}

// ──── STYLE: ridge ────
function drawRidge(ctx: CanvasRenderingContext2D, histogram: HistogramData, o: Required<DrawHistogramOptions>): void {
  const { x, y, width, height, darkMode, smoothing } = o;
  const bg = darkMode ? '#0a0a0a' : '#fafafa';
  const baselineColor = darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  ctx.save();
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, width, height);
  ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();

  const dataList: { bins: Float32Array; stroke: string; fill: string }[] = [];
  if (o.channels === 'luma') {
    dataList.push({
      bins: smoothBins(histogram.luma, 3),
      stroke: darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.85)',
      fill: darkMode ? 'rgba(0,0,0,0.95)' : 'rgba(255,255,255,0.95)',
    });
  } else {
    const channels = o.channels === 'rgb' ? ['r','g','b'] : ['r','g','b','luma'];
    const colors: Record<string, string> = darkMode ? {
      r: 'rgba(255,90,90,1)', g: 'rgba(90,230,130,1)',
      b: 'rgba(120,160,255,1)', luma: 'rgba(255,255,255,1)',
    } : {
      r: 'rgba(200,60,60,1)', g: 'rgba(60,160,90,1)',
      b: 'rgba(70,110,220,1)', luma: 'rgba(0,0,0,0.85)',
    };
    for (const ch of channels) {
      dataList.push({
        bins: smoothBins((histogram as unknown as Record<string, Uint32Array>)[ch], 3),
        stroke: colors[ch],
        fill: bg,
      });
    }
  }

  const max = findMax(dataList.map(c => c.bins));
  const rowHeight = height / dataList.length;
  const overlap = rowHeight * 0.6;

  for (let i = dataList.length - 1; i >= 0; i--) {
    const ch = dataList[i];
    const ridgeY = y + i * rowHeight;
    const ridgeH = rowHeight + overlap;
    ctx.fillStyle = ch.fill;
    fillPathClosed(ctx, ch.bins, max, x, ridgeY, width, ridgeH, smoothing); ctx.fill();
    ctx.strokeStyle = ch.stroke; ctx.lineWidth = 1.5;
    strokePathOpen(ctx, ch.bins, max, x, ridgeY, width, ridgeH, smoothing); ctx.stroke();
    ctx.strokeStyle = baselineColor; ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, ridgeY + ridgeH);
    ctx.lineTo(x + width, ridgeY + ridgeH);
    ctx.stroke();
  }
  ctx.restore();
}

// ──── Entry ────
export function drawHistogram(
  ctx: CanvasRenderingContext2D,
  histogram: HistogramData,
  options: DrawHistogramOptions
): void {
  const merged: Required<DrawHistogramOptions> = {
    style: 'classic',
    channels: 'rgb',
    darkMode: false,
    smoothing: 0.85,
    opacity: 0.55,
    showGrid: true,
    showClipping: true,
    ...options,
  };

  switch (merged.style) {
    case 'minimal':  return drawMinimal(ctx, histogram, merged);
    case 'bars':     return drawBars(ctx, histogram, merged);
    case 'waveform': return drawWaveform(ctx, histogram, merged);
    case 'comic':    return drawComic(ctx, histogram, merged);
    case 'neon':     return drawNeon(ctx, histogram, merged);
    case 'pastel':   return drawPastel(ctx, histogram, merged);
    case 'ridge':    return drawRidge(ctx, histogram, merged);
    case 'classic':
    default:         return drawClassic(ctx, histogram, merged);
  }
}