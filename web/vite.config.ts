import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

/**
 * Vite configuration — performance-tuned but conservative.
 *
 * Notes:
 *  - We do NOT manually split React/React-DOM/Konsta into separate chunks.
 *    These libraries have intricate internal references (jsx-runtime,
 *    scheduler, etc.) and forcing them into separate chunks can produce
 *    "Cannot read properties of undefined" or two-React-instance errors,
 *    which manifest as a blank white screen at runtime.
 *  - Vite/Rollup's default chunking is already good. We just disable
 *    sourcemaps and strip debug statements for production.
 */
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
  esbuild: {
    // Strip debug noise from production bundles. Safe because no
    // library in this app relies on console.* for side effects.
    drop: ['debugger'],
    legalComments: 'none',
  },
});
