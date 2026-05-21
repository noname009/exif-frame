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

import { ReactNode, useEffect } from 'react';
import { useStore } from '../store';
import './ef-shell.css';

/**
 * EF 앱의 외부 셸. 페이지 콘텐츠 + 하단 고정 탭바.
 *
 * 모바일 브라우저(특히 iOS Safari)의 주소창이 표시되거나 사라질 때
 * 화면 높이가 바뀐다. CSS `100dvh`로 어느 정도 대응되지만 일부
 * 환경에서는 동작이 늦거나 안 된다. 보강책으로 `visualViewport` API의
 * 실제 가시 높이를 CSS 변수 `--ef-vh`에 넣어, 셸이 항상 그만큼만
 * 차지하도록 한다.
 */
export const EfShell = ({ children }: { children: ReactNode }) => {
  const { darkMode } = useStore();

  // 라이트 모드 토글
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('ef-light', !darkMode);
  }

  // Visual viewport 추적: 일반 리사이즈에서는 --ef-vh 업데이트,
  // 단 키보드(가상 키보드) 때문에 viewport가 줄어든 경우는 셸 높이를 유지해서
  // 미리보기·옵션 카드 같은 다른 UI가 압축되지 않도록 한다.
  useEffect(() => {
    let baselineHeight = window.innerHeight;
    function update() {
      const visualH = window.visualViewport?.height ?? window.innerHeight;
      // 키보드가 올라오면 visualViewport.height < window.innerHeight (~60% 정도).
      // 그 경우엔 baselineHeight를 그대로 유지해서 UI가 흔들리지 않게 한다.
      // 일반 리사이즈(주소창, 회전 등)에선 새 높이를 baseline으로 받아들임.
      const keyboardOpen = visualH < window.innerHeight - 100;
      if (!keyboardOpen) {
        baselineHeight = visualH;
      }
      document.documentElement.style.setProperty('--ef-vh', `${baselineHeight}px`);
    }
    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  // 키보드 관련 강제 스크롤 로직 없음.
  // 옵션 입력은 모달 시트 방식이라 키보드 위에 항상 자리잡고,
  // 일반 input은 브라우저 기본 동작에 맡긴다.

  return (
    <div className="ef-shell">
      <div className="ef-shell__content ef-scroll">{children}</div>
      <EfTabbar />
    </div>
  );
};

/* ── Tabbar ───────────────────────────────────────────────── */

const TABS = [
  { id: 0, label: '사진',   icon: PhotosIcon },
  { id: 1, label: '테마',   icon: ThemesIcon },
  { id: 2, label: '설정',   icon: GearIcon },
] as const;

const EfTabbar = () => {
  const { tabIndex, setTabIndex } = useStore();
  return (
    <nav className="ef-tabbar ef-safe-bottom" role="tablist">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tabIndex === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            className={`ef-tab${active ? ' ef-tab--active' : ''}`}
            onClick={() => setTabIndex(t.id)}
          >
            <span className="ef-tab__icon"><Icon /></span>
            <span className="ef-tab__label">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

/* ── Icons (inline SVG, no extra deps) ─────────────────────── */

function PhotosIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10.5" r="1.5" />
      <path d="M21 16l-5-5L7 19" />
    </svg>
  );
}
function ThemesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}