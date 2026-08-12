import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// base './' supaya asset relatif.
// viteSingleFile: JS+CSS di-inline ke 1 file index.html mandiri,
// sehingga hasil build bisa di-double-click (file://) seperti tool lain,
// sekaligus tetap jalan bila di-serve via http/https.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000
  }
});
