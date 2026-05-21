/* Modified by noname009 (https://github.com/noname009) in 2026.
 * Part of a GPL-3.0 fork of https://github.com/jeonghyeon-net/exif-frame. */

import { lazy, Suspense, memo, useEffect, Component, ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useStore } from './store';
import { EfShell } from './ui/ef-shell';

/**
 * Route-level code splitting.
 *
 * Each page becomes its own chunk fetched on demand. The three main
 * tabs (convert / theme / settings) are pre-warmed after the first
 * paint so tab switching feels instant.
 */

const FramePage = lazy(() => import('./pages/convert/page'));
const ThemeSettingsPage = lazy(() => import('./pages/theme/page'));
const ExportSettingsPage = lazy(() => import('./pages/setting/page'));
const TermAndConditionsPage = lazy(() => import('./pages/term-and-conditions'));
const PrivacyPolicyPage = lazy(() => import('./pages/privacy-policy'));
const SponsorsPage = lazy(() => import('./pages/sponsors'));
const LabPage = lazy(() => import('./pages/lab/page'));
const MetadataPage = lazy(() => import('./pages/metadata/page'));

/**
 * Error boundary so a chunk-load failure doesn't leave the user
 * with a blank screen — they get a "Reload" button instead.
 */
class ChunkErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    // Log so users can report what went wrong
    // eslint-disable-next-line no-console
    console.error('Page chunk failed to load:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <h2>Something went wrong loading this page.</h2>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', marginTop: 8, cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Memoized tab renderer.
 *
 * Subscribes only to `tabIndex` so unrelated store changes (loading,
 * popups, etc.) no longer trigger remounts. Pre-warming happens here
 * via useEffect AFTER the first paint — never at module load time,
 * which would risk delaying the initial render.
 */
const TabbedHome = memo(() => {
  const tabIndex = useStore((state) => state.tabIndex);

  useEffect(() => {
    // Pre-warm the three main tabs once, after first paint.
    const prewarm = () => {
      void import('./pages/convert/page');
      void import('./pages/theme/page');
      void import('./pages/setting/page');
    };
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => void };
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(prewarm);
    } else {
      setTimeout(prewarm, 1500);
    }
  }, []);

  return (
    <EfShell>
      <Suspense fallback={null}>
        {tabIndex === 0 && <FramePage />}
        {tabIndex === 1 && <ThemeSettingsPage />}
        {tabIndex === 2 && <ExportSettingsPage />}
      </Suspense>
    </EfShell>
  );
});
TabbedHome.displayName = 'TabbedHome';

const Router = () => {
  return (
    <BrowserRouter>
      <ChunkErrorBoundary>
        <Routes>
          <Route path="/" element={<TabbedHome />} />
          <Route
            path="/privacy_policy.html"
            element={
              <Suspense fallback={null}>
                <PrivacyPolicyPage />
              </Suspense>
            }
          />
          <Route
            path="/term_and_conditions.html"
            element={
              <Suspense fallback={null}>
                <TermAndConditionsPage />
              </Suspense>
            }
          />
          <Route
            path="/sponsors"
            element={
              <Suspense fallback={null}>
                <SponsorsPage />
              </Suspense>
            }
          />
          <Route
            path="/lab"
            element={
              <Suspense fallback={null}>
                <LabPage />
              </Suspense>
            }
          />
          <Route
            path="/metadata"
            element={
              <Suspense fallback={null}>
                <MetadataPage />
              </Suspense>
            }
          />
        </Routes>
      </ChunkErrorBoundary>
    </BrowserRouter>
  );
};

export default Router;