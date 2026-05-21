/* Modified by noname009 (https://github.com/noname009) in 2026.
 * Part of a GPL-3.0 fork of https://github.com/jeonghyeon-net/exif-frame. */

import { useEffect, useRef, useState } from 'react';
import { useStore, Store } from '../../store';
import Photo from '../../core/photo';
import themes from '../../themes';
import render from '../../core/drawing/render';
import free from '../../core/drawing/free';
import Customize from './database/customize';
import { ThemeOptionInput, getConverter } from './types/theme-option';
import ThemeOptionsPanel from './components/theme-options-panel';
import Loading from '../convert/components/loading';
import { EfButton } from '../../ui/ef-ui';
import './theme-page.css';

const ThemeSettingsPage = () => {
  const store = useStore();
  const { selectedThemeName, setSelectedThemeName, photos, setRerenderOptions } = store;

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showClassic, setShowClassic] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(true);
  const [zoomed, setZoomed] = useState(false);

  const theme = themes.find((t) => t.name === selectedThemeName);

  // 17~22번이 신규, 1~16이 클래식
  const NEW_START = 16;
  const newThemes = themes.slice(NEW_START);
  const classicThemes = themes.slice(0, NEW_START);

  // 선택된 테마가 클래식이면 클래식을 자동 펼침
  useEffect(() => {
    const idx = themes.findIndex((t) => t.name === selectedThemeName);
    if (idx >= 0 && idx < NEW_START) setShowClassic(true);
  }, [selectedThemeName]);

  // 큰 미리보기 그리기
  useEffect(() => {
    if (photos.length === 0) return;
    if (!theme) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const photo = photos[0];
    const input: ThemeOptionInput = new Map();
    theme.options.forEach((opt) => {
      const v = Customize.get(selectedThemeName, opt.id, getConverter(opt.type));
      input.set(opt.id, v ?? opt.default);
    });

    let cancelled = false;
    render(theme.func, photo, input, store).then((rendered) => {
      if (cancelled) { free(rendered); return; }
      drawCanvasIntoPreview(rendered, canvas);
      free(rendered);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, selectedThemeName, store.rerenderOptions, store.darkMode]);

  const hasPhotos = photos.length > 0;

  return (
    <div className="ef-theme">
      {/* ── Preview ────────────────────────────────────── */}
      <div className="ef-theme__preview">
        {hasPhotos ? (
          <div className="ef-theme__canvas-wrap">
            <canvas
              ref={previewCanvasRef}
              className="ef-theme__canvas"
              onClick={() => setZoomed(true)}
            />
            <button
              type="button"
              className="ef-theme__zoom-btn"
              onClick={() => setZoomed(true)}
              aria-label="확대 보기"
            >
              <ZoomIcon />
            </button>
          </div>
        ) : (
          <div className="ef-theme__no-photo">
            <p>먼저 사진을 추가하세요</p>
          </div>
        )}
      </div>

      {/* Left column on wide screens (themes + options) */}
      <div className="ef-theme__rail ef-scroll">

      {/* ── Theme cards (horizontal scroll) ────────────── */}
      <section className="ef-theme__themes">
        <div className="ef-theme__themes-header">
          <span className="ef-theme__themes-label">테마</span>
          <button
            type="button"
            className={`ef-theme__classic-btn${showClassic ? ' is-on' : ''}`}
            onClick={() => setShowClassic((v) => !v)}
          >
            클래식 {showClassic ? '숨기기' : '보기'} ({classicThemes.length})
          </button>
        </div>

        <div className="ef-theme__cards ef-scroll">
          {newThemes.map((t) => (
            <ThemeCard
              key={t.name}
              name={t.name}
              selected={t.name === selectedThemeName}
              onClick={() => setSelectedThemeName(t.name)}
            />
          ))}
          {showClassic && classicThemes.map((t) => (
            <ThemeCard
              key={t.name}
              name={t.name}
              selected={t.name === selectedThemeName}
              classic
              onClick={() => setSelectedThemeName(t.name)}
            />
          ))}
        </div>
      </section>

      {/* ── Options panel ───────────────────────────────── */}
      {theme && theme.options.length > 0 && (
        <section className={`ef-theme__options${optionsOpen ? '' : ' is-collapsed'}`}>
          <button
            type="button"
            className="ef-theme__options-toggle"
            onClick={() => setOptionsOpen((v) => !v)}
          >
            <span>옵션 ({theme.options.length})</span>
            <ChevronIcon up={optionsOpen} />
          </button>
          {optionsOpen && (
            <div className="ef-theme__options-body">
              <div className="ef-theme__options-actions">
                <EfButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    theme.options.forEach((opt) => {
                      Customize.delete(theme.name, opt.id);
                    });
                    setRerenderOptions();
                  }}
                >
                  초기화
                </EfButton>
                <EfButton
                  variant="accent"
                  size="sm"
                  onClick={() => setRerenderOptions()}
                >
                  지금 적용
                </EfButton>
              </div>
              <ThemeOptionsPanel options={theme.options} themeName={theme.name} />
            </div>
          )}
        </section>
      )}

      </div>{/* /rail */}

      {/* ── Zoom modal ──────────────────────────────────── */}
      {zoomed && hasPhotos && (
        <ZoomModal
          themeName={selectedThemeName}
          photo={photos[0]}
          store={store}
          onClose={() => setZoomed(false)}
          canvasRef={zoomCanvasRef}
        />
      )}

      <Loading />
    </div>
  );
};

/* ── ZoomModal — full-screen preview ───────────────────── */

const ZoomModal = ({ themeName, photo, store, onClose, canvasRef }: {
  themeName: string;
  photo: Photo;
  store: Store;
  onClose: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) => {
  // 자체 줌/팬 상태
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const draggingRef = useRef<{ startX: number; startY: number; baseTx: number; baseTy: number } | null>(null);
  // 핀치 줌 (touch) 추적
  const pinchRef = useRef<{ startDist: number; baseScale: number } | null>(null);

  useEffect(() => {
    const theme = themes.find((t) => t.name === themeName);
    if (!theme) return;

    const input: ThemeOptionInput = new Map();
    theme.options.forEach((opt) => {
      const v = Customize.get(themeName, opt.id, getConverter(opt.type));
      input.set(opt.id, v ?? opt.default);
    });

    let cancelled = false;
    requestAnimationFrame(() => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      render(theme.func, photo, input, store).then((rendered) => {
        if (cancelled) { free(rendered); return; }
        drawCanvasIntoPreview(rendered, canvas);
        free(rendered);
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeName, photo, store.rerenderOptions]);

  // ESC 닫기 + body 스크롤 잠금
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [onClose]);

  function clampScale(s: number) { return Math.max(1, Math.min(6, s)); }

  // 마우스 휠로 줌 (데스크탑)
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setScale((s) => clampScale(s * (1 + delta)));
  }

  // 드래그로 팬 (마우스/터치 공통)
  function onPointerDown(e: React.PointerEvent) {
    // 두 손가락 핀치는 touch 이벤트에서 처리
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = { startX: e.clientX, startY: e.clientY, baseTx: tx, baseTy: ty };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    if (scale <= 1) return; // 1배율에선 팬 비활성
    const d = draggingRef.current;
    setTx(d.baseTx + (e.clientX - d.startX));
    setTy(d.baseTy + (e.clientY - d.startY));
  }
  function onPointerUp() {
    draggingRef.current = null;
  }

  // Pinch zoom — 두 손가락 거리 변화로 scale 조정
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { startDist: Math.hypot(dx, dy), baseScale: scale };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      setScale(clampScale(pinchRef.current.baseScale * (dist / pinchRef.current.startDist)));
    }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
  }

  // 더블탭/더블클릭으로 줌 토글
  function onDouble() {
    if (scale > 1) {
      setScale(1); setTx(0); setTy(0);
    } else {
      setScale(2.5);
    }
  }

  function resetZoom() {
    setScale(1); setTx(0); setTy(0);
  }

  return (
    <div className="ef-zoom" onClick={onClose}>
      <button type="button" className="ef-zoom__close" onClick={onClose} aria-label="닫기">
        <CloseIcon />
      </button>
      <div className="ef-zoom__controls" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ef-zoom__ctrl" onClick={() => setScale((s) => clampScale(s + 0.5))} aria-label="확대">+</button>
        <span className="ef-zoom__scale">{Math.round(scale * 100)}%</span>
        <button type="button" className="ef-zoom__ctrl" onClick={() => setScale((s) => clampScale(s - 0.5))} aria-label="축소">−</button>
        <button type="button" className="ef-zoom__ctrl ef-zoom__ctrl--text" onClick={resetZoom} aria-label="초기화">1:1</button>
      </div>
      <div
        className="ef-zoom__canvas-wrap"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={onDouble}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          cursor: scale > 1 ? 'grab' : 'zoom-in',
        }}
      >
        <canvas
          ref={canvasRef}
          className="ef-zoom__canvas"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transition: draggingRef.current ? 'none' : 'transform 150ms ease',
          }}
        />
      </div>
    </div>
  );
};

/* ── ThemeCard ──────────────────────────────────────────── */

const ThemeCard = ({ name, selected, classic, onClick }: {
  name: string; selected: boolean; classic?: boolean; onClick: () => void;
}) => (
  <button
    type="button"
    className={`ef-theme-card${selected ? ' is-selected' : ''}${classic ? ' is-classic' : ''}`}
    onClick={onClick}
  >
    <div className="ef-theme-card__preview">
      <ThemeMockPreview name={name} />
    </div>
    <div className="ef-theme-card__name">{name}</div>
  </button>
);

/**
 * 테마 카드 안에 들어가는 간단한 추상 미리보기.
 * 사진을 매번 렌더하면 비싸므로 SVG로 각 테마의 특징을 도식화.
 */
const ThemeMockPreview = ({ name }: { name: string }) => {
  // 테마 이름에 따라 다른 도식을 보여줌
  const variant = mockVariantFor(name);
  return (
    <svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMid meet" className="ef-theme-mock">
      <rect x="0" y="0" width="100" height="130" fill="var(--ef-bg-raised)" />
      {variant.frame && (
        <rect
          x="6" y="6"
          width="88" height="118"
          fill={variant.frameFill || '#1a1a1a'}
        />
      )}
      {/* photo area */}
      <rect
        x={variant.px} y={variant.py}
        width={variant.pw} height={variant.ph}
        fill="url(#ef-mock-grad)"
      />
      {variant.elements?.map((el, i) => (
        <rect key={i} {...el} fill={el.fill || 'var(--ef-text-dim)'} opacity={el.opacity ?? 0.7} />
      ))}
      <defs>
        <linearGradient id="ef-mock-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#6b8aa9" />
          <stop offset="60%"  stopColor="#9c7159" />
          <stop offset="100%" stopColor="#3d2418" />
        </linearGradient>
      </defs>
    </svg>
  );
};

type RectEl = { x: number; y: number; width: number; height: number; fill?: string; opacity?: number };
type MockVariant = {
  frame: boolean;
  frameFill?: string;
  px: number; py: number; pw: number; ph: number;
  elements?: RectEl[];
};

function mockVariantFor(name: string): MockVariant {
  switch (name) {
    case 'Histogram':
      return { frame: true, frameFill: '#eee', px: 14, py: 14, pw: 72, ph: 78, elements: [
        { x: 14, y: 96, width: 36, height: 18, fill: '#222' },
        { x: 54, y: 96, width: 32, height: 18, fill: '#bbb', opacity: 0.4 },
      ]};
    case 'Gallery Card':
      return { frame: true, frameFill: '#1a1a1a', px: 14, py: 14, pw: 50, ph: 102, elements: [
        { x: 68, y: 18, width: 22, height: 4, fill: '#f0ece4' },
        { x: 68, y: 26, width: 16, height: 3, fill: '#999' },
        { x: 68, y: 96, width: 22, height: 2, fill: '#444' },
        { x: 68, y: 102, width: 18, height: 3, fill: '#f0ece4' },
      ]};
    case 'Modern Strap':
      return { frame: true, frameFill: '#101010', px: 10, py: 10, pw: 80, ph: 88, elements: [
        { x: 14, y: 104, width: 72, height: 16, fill: '#222' },
      ]};
    case 'Postcard':
      return { frame: true, frameFill: '#1a1a1a', px: 14, py: 32, pw: 72, ph: 58, elements: [
        { x: 14, y: 14, width: 36, height: 4, fill: '#f0ece4' },
        { x: 14, y: 22, width: 22, height: 3, fill: '#999' },
        { x: 14, y: 96, width: 30, height: 3, fill: '#f0ece4' },
        { x: 14, y: 104, width: 24, height: 2, fill: '#666' },
        { x: 14, y: 112, width: 32, height: 2, fill: '#888' },
      ]};
    case 'Overlay Card':
      return { frame: false, px: 0, py: 0, pw: 100, ph: 130, elements: [
        { x: 0, y: 0, width: 60, height: 30, fill: '#000', opacity: 0.45 },
        { x: 6, y: 10, width: 32, height: 4, fill: '#fff' },
        { x: 6, y: 18, width: 18, height: 3, fill: '#fff', opacity: 0.7 },
        { x: 40, y: 100, width: 60, height: 30, fill: '#000', opacity: 0.45 },
        { x: 60, y: 110, width: 32, height: 4, fill: '#fff' },
        { x: 60, y: 118, width: 28, height: 3, fill: '#fff', opacity: 0.7 },
      ]};
    case 'Architecture Grid':
      return { frame: true, frameFill: '#f4f1ea', px: 22, py: 26, pw: 56, ph: 78, elements: [
        { x: 10, y: 10, width: 28, height: 18, fill: '#fff' },
        { x: 62, y: 108, width: 28, height: 14, fill: '#fff' },
      ]};
    default:
      // classic 기본
      return { frame: true, frameFill: '#1a1a1a', px: 10, py: 10, pw: 80, ph: 90, elements: [
        { x: 10, y: 104, width: 80, height: 18, fill: '#222' },
      ]};
  }
}

function drawCanvasIntoPreview(src: HTMLCanvasElement, dst: HTMLCanvasElement) {
  const parent = dst.parentElement;
  if (!parent) return;
  const containerW = parent.clientWidth;
  const containerH = parent.clientHeight;
  if (containerW === 0 || containerH === 0) return;

  const srcRatio = src.width / src.height;
  const containerRatio = containerW / containerH;
  let drawW: number, drawH: number;
  if (srcRatio > containerRatio) {
    drawW = containerW;
    drawH = containerW / srcRatio;
  } else {
    drawH = containerH;
    drawW = containerH * srcRatio;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  dst.width = Math.round(drawW * dpr);
  dst.height = Math.round(drawH * dpr);
  dst.style.width = `${drawW}px`;
  dst.style.height = `${drawH}px`;
  const ctx = dst.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, dst.width, dst.height);
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: up ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ZoomIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default ThemeSettingsPage;