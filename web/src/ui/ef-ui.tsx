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

import { ReactNode, useEffect, useRef, useState } from 'react';
import './ef-ui.css';

/* ── IconButton ────────────────────────────────────────── */

export const EfIconButton = ({
  icon, label, onClick, variant = 'ghost', size = 'md', disabled,
}: {
  icon: ReactNode;
  label?: string;
  onClick?: () => void;
  variant?: 'ghost' | 'solid' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}) => (
  <button
    type="button"
    className={`ef-icon-btn ef-icon-btn--${variant} ef-icon-btn--${size}`}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
  >
    {icon}
    {label && <span className="ef-icon-btn__label">{label}</span>}
  </button>
);

/* ── PrimaryButton ─────────────────────────────────────── */

export const EfButton = ({
  children, onClick, variant = 'solid', size = 'md', disabled, full, icon,
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: 'solid' | 'accent' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  full?: boolean;
  icon?: ReactNode;
}) => (
  <button
    type="button"
    className={`ef-btn ef-btn--${variant} ef-btn--${size}${full ? ' ef-btn--full' : ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    {icon && <span className="ef-btn__icon">{icon}</span>}
    {children}
  </button>
);

/* ── Section header ───────────────────────────────────── */

export const EfSectionTitle = ({
  children, action,
}: { children: ReactNode; action?: ReactNode }) => (
  <div className="ef-section-title">
    <span>{children}</span>
    {action}
  </div>
);

/* ── BottomSheet ──────────────────────────────────────── */
/*
 * 드래그 핸들 + 스냅 포인트 2개(peek, full).
 * 모바일 친화: 손가락 드래그로 높이 조절.
 */

export const EfBottomSheet = ({
  open, onClose, children, peekHeight = 240, snapPoints = [240, '70%'],
  title,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  peekHeight?: number;
  snapPoints?: Array<number | string>;
  title?: ReactNode;
}) => {
  const [snapIdx, setSnapIdx] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const startHeight = useRef<number>(0);
  const [dragH, setDragH] = useState<number | null>(null);

  useEffect(() => { if (!open) setSnapIdx(0); }, [open]);

  function resolveSnap(s: number | string): number {
    if (typeof s === 'number') return s;
    if (s.endsWith('%')) return Math.round(window.innerHeight * parseInt(s) / 100);
    return parseInt(s) || peekHeight;
  }

  const currentH = dragH ?? resolveSnap(snapPoints[snapIdx] ?? peekHeight);

  function onPointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
    startHeight.current = currentH;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const dy = dragStartY.current - e.clientY; // 위로 드래그 = +
    setDragH(Math.max(80, startHeight.current + dy));
  }
  function onPointerUp() {
    if (dragH === null) { dragStartY.current = null; return; }
    // 가장 가까운 스냅 포인트로
    const targets = snapPoints.map(resolveSnap);
    let best = 0, bestDist = Infinity;
    targets.forEach((t, i) => {
      const d = Math.abs(t - dragH);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    // 아래로 너무 끌면 닫기
    if (dragH < targets[0] * 0.6 && onClose) {
      onClose();
    } else {
      setSnapIdx(best);
    }
    setDragH(null);
    dragStartY.current = null;
  }

  if (!open) return null;

  return (
    <>
      <div className="ef-sheet__scrim" onClick={onClose} />
      <div
        ref={sheetRef}
        className="ef-sheet ef-safe-bottom"
        style={{ height: currentH }}
      >
        <div
          className="ef-sheet__handle-area"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="ef-sheet__handle" />
        </div>
        {title && <div className="ef-sheet__title">{title}</div>}
        <div className="ef-sheet__body ef-scroll">{children}</div>
      </div>
    </>
  );
};

/* ── Horizontal scroll row ─────────────────────────────── */

export const EfScrollRow = ({ children }: { children: ReactNode }) => (
  <div className="ef-scroll-row ef-scroll">{children}</div>
);

/* ── Toggle ────────────────────────────────────────────── */

export const EfToggle = ({
  value, onChange, ariaLabel,
}: { value: boolean; onChange: (v: boolean) => void; ariaLabel?: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={value}
    aria-label={ariaLabel}
    onClick={() => onChange(!value)}
    className={`ef-toggle${value ? ' ef-toggle--on' : ''}`}
  >
    <span className="ef-toggle__thumb" />
  </button>
);

/* ── Range slider ──────────────────────────────────────── */

export const EfSlider = ({
  value, min, max, step, onChange, formatValue,
}: {
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}) => (
  <div className="ef-slider">
    <input
      type="range"
      className="ef-slider__input"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
    />
    <span className="ef-slider__value">
      {formatValue ? formatValue(value) : formatNum(value)}
    </span>
  </div>
);

function formatNum(n: number): string {
  if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n));
  return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}