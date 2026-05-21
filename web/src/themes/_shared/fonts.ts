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
 * 테마들이 공통으로 사용하는 폰트 옵션.
 * - FONT_OPTIONS: 실제 canvas font-family CSS 값 (label과 같은 인덱스 순서)
 * - FONT_LABELS: 사용자에게 보여줄 폰트 이름
 * - resolveFontFamily(label): label로 CSS font-family 문자열 얻기
 *
 * 한글 폰트는 /web/src/fonts.ts에서 Google Fonts 로드 필요.
 */

export const FONT_OPTIONS = [
  'Barlow, system-ui, sans-serif',
  'system-ui, sans-serif',
  '"Noto Serif KR", "Noto Serif", Georgia, serif',
  '"Nanum Myeongjo", "Nanum Myeongjo OTF", Georgia, serif',
  '"Nanum Gothic", system-ui, sans-serif',
  '"IBM Plex Sans KR", system-ui, sans-serif',
  '"Noto Sans KR", system-ui, sans-serif',
  'Georgia, "Times New Roman", serif',
];

export const FONT_LABELS = [
  '기본 (Barlow)',
  '시스템 기본',
  'Noto Serif KR (한글용)',
  '나눔명조 (한글용)',
  '나눔고딕 (한글용)',
  'IBM Plex Sans KR (한글용)',
  'Noto Sans KR (한글용)',
  'Georgia (클래식 세리프)',
];

export function resolveFontFamily(label: string): string {
  const idx = FONT_LABELS.indexOf(label);
  return FONT_OPTIONS[idx] ?? FONT_OPTIONS[0];
}