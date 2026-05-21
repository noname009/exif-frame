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
import overrideExifMetadata from '../exif-metadata/override-exif-metadata';

/**
 * Maker logo resolver — extracted from the STRAP theme so any theme
 * (Histogram, custom user themes, etc.) can reuse the same lookup.
 *
 * The original STRAP theme hard-coded 27 if-blocks. This module replaces
 * that with a data table: adding a new brand is a single line.
 *
 * Order matters: more-specific brand keywords (e.g. PENTAX) must come
 * before less-specific ones (e.g. RICOH) because some cameras report
 * their maker as "RICOH IMAGING COMPANY, PENTAX K-3" — we want PENTAX
 * to win in that case.
 */

type Theme = 'light' | 'dark';

interface BrandEntry {
  /** Substring matched against EXIF Make/Model (case-insensitive) */
  keyword: string;
  /** Filename stem under /maker/{theme}/ */
  file: string;
}

const BRANDS: BrandEntry[] = [
  { keyword: 'APPLE', file: 'apple' },
  { keyword: 'CANON', file: 'canon' },
  { keyword: 'CONTAX', file: 'contax' },
  { keyword: 'DJI', file: 'dji' },
  { keyword: 'EPSON', file: 'epson' },
  { keyword: 'FUJI', file: 'fujifilm' },
  { keyword: 'GOLDSTAR', file: 'goldstar' },
  { keyword: 'HASSELBLAD', file: 'hasselblad' },
  { keyword: 'LEICA', file: 'leica' },
  { keyword: 'LG', file: 'lg' },
  { keyword: 'MAMIYA', file: 'mamiya' },
  { keyword: 'NIKON', file: 'nikon' },
  { keyword: 'OLYMPUS', file: 'olympus' },
  { keyword: 'OM', file: 'om' },
  { keyword: 'PANASONIC', file: 'lumix' },
  { keyword: 'PHASE', file: 'phaseone' },
  { keyword: 'RICO', file: 'ricoh' },
  // PENTAX comes after RICOH so it wins on Ricoh/Pentax bodies
  { keyword: 'PENTAX', file: 'pentax' },
  { keyword: 'SIGMA', file: 'sigma' },
  { keyword: 'SONY', file: 'sony' },
  { keyword: 'SAMSUNG', file: 'samsung' },
];

// Cache loaded HTMLImageElements so we don't refetch on every render
const cache = new Map<string, HTMLImageElement>();

function loadLogo(file: string, theme: Theme): HTMLImageElement {
  const key = `${theme}/${file}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const image = new Image();
  image.src = `/maker/${theme}/${file}.png`;
  cache.set(key, image);
  return image;
}

/**
 * Returns the best-matching brand logo for a photo, or undefined if
 * none of the known brand keywords are found in Make/Model.
 *
 * Uses overrideExifMetadata() so user overrides (set in the metadata
 * page) are respected — same behavior as the STRAP theme.
 */
export function resolveBrandLogo(photo: Photo, theme: Theme): HTMLImageElement | undefined {
  const maker = (overrideExifMetadata()?.make || photo.metadata.make || '').toUpperCase();
  const model = (overrideExifMetadata()?.model || photo.metadata.model || '').toUpperCase();

  let match: BrandEntry | undefined;
  for (const brand of BRANDS) {
    if (maker.includes(brand.keyword) || model.includes(brand.keyword)) {
      match = brand;
      // don't break — later entries can override (PENTAX over RICOH, etc.)
    }
  }

  return match ? loadLogo(match.file, theme) : undefined;
}

/**
 * Draws a logo onto a 2D context, scaled to fit within (maxWidth × maxHeight)
 * while preserving aspect ratio. The logo is anchored at (x, y) which is
 * its top-left corner by default; pass `anchor: 'center'` to center it.
 */
export function drawBrandLogo(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement,
  options: {
    x: number;
    y: number;
    maxWidth: number;
    maxHeight: number;
    anchor?: 'top-left' | 'center' | 'left-center';
    opacity?: number;
  }
): { width: number; height: number } {
  const { x, y, maxWidth, maxHeight, anchor = 'top-left', opacity = 1 } = options;

  // Fit-inside scaling
  const scale = Math.min(maxWidth / logo.width, maxHeight / logo.height);
  const w = logo.width * scale;
  const h = logo.height * scale;

  let drawX = x;
  let drawY = y;
  if (anchor === 'center') {
    drawX = x - w / 2;
    drawY = y - h / 2;
  } else if (anchor === 'left-center') {
    drawY = y - h / 2;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(logo, drawX, drawY, w, h);
  ctx.restore();

  return { width: w, height: h };
}