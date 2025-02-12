import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { chromeExtension } from 'vite-plugin-chrome-extension';
import { resolve } from 'path';
import fs from 'fs-extra';

// 复制 _locales 目录到 dist
function copyLocales() {
  return {
    name: 'copy-locales',
    closeBundle() {
      fs.copySync('src/_locales', 'dist/_locales');
    }
  };
}

export default defineConfig({
  plugins: [
    vue(),
    chromeExtension(),
    copyLocales()
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