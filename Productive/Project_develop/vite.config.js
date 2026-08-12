import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' supaya asset (JS/CSS) ikut relatif terhadap index.html
// sehingga hasil build di dist/ bisa di-embed via iframe dari mana saja.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist' }
});
