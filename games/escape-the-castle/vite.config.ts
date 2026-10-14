import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build as a self-contained UMD bundle exposing a global `EscapeTheCastle`
// with mountGame(el). React is bundled in (not externalized) so the single
// file is drop-in on the static site. base:'./' keeps any emitted asset
// paths relative so it works when served from a subdirectory.
export default defineConfig({
  base: './',
  plugins: [react()],
  // Lib mode does not auto-replace this the way an app build does; without it
  // the UMD bundle references `process` and throws in the browser.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/mount.tsx',
      name: 'EscapeTheCastle',
      formats: ['umd'],
      fileName: () => 'escape-the-castle.js',
    },
  },
});
