// vite.config.js - Build configuration
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
    cssCodeSplit: true,
    sourcemap: true,
    target: 'es2020',
    modulePreload: {
      polyfill: true
    },
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/css/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name)) {
            return `assets/images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
        manualChunks: {
          'vendor-core': ['./src/core/router.js', './src/core/theme-manager.js', './src/core/iframe-communicator.js'],
          'vendor-components': ['./src/components/tool-card.js'],
          'vendor-styles': ['./src/styles/design-system.css', './src/styles/components.css', './src/styles/utilities.css']
        }
      }
    },
    
    esbuild: {
      drop: ['console', 'debugger'],
      pure: ['console.log']
    }
  },
  
  server: {
    port: 3000,
    open: true,
    cors: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  
  preview: {
    port: 4173,
    open: true
  },
  
  css: {
    devSourcemap: true
  },
  
  optimizeDeps: {
    include: []
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@core': resolve(__dirname, 'src/core'),
      '@components': resolve(__dirname, 'src/components'),
      '@styles': resolve(__dirname, 'src/styles'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  },
  
  define: {
    'process.env.NODE_ENV': '"production"'
  }
});