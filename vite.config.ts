import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

// Plugin to strip 'crossorigin' attribute from index.html scripts/links.
// Android WebView's WebViewAssetLoader blocks local assets if 'crossorigin' is present.
const removeCrossorigin = (): Plugin => ({
  name: 'remove-crossorigin',
  transformIndexHtml(html: string) {
    return html.replace(/\s+crossorigin(=("[^"]*"|'[^']*'|[^\s>]+))?/gi, '');
  }
});

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      removeCrossorigin(),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      target: ['chrome60', 'es2015'],
      cssTarget: 'chrome60',
      chunkSizeWarningLimit: 2000,
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler') || id.includes('motion')) {
                return 'vendor-react';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
            }
          }
        }
      }
    },
  };
});
