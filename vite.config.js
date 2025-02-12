import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { chromeExtension } from 'vite-plugin-chrome-extension';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    chromeExtension()
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        manifest: resolve(__dirname, 'src/manifest.json')
      },
      output: {
        assetFileNames: (assetInfo) => {
          const cssFileName = 'style.css';
          if (assetInfo.name.endsWith('.css')) {
            return cssFileName;
          }
          return '[name].[hash][extname]';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});