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

// 复制样式文件到 dist
function copyStyles() {
  return {
    name: 'copy-styles',
    closeBundle() {
      fs.ensureDirSync('dist/styles');
      fs.copySync('src/styles/global.css', 'dist/styles/global.css');
      fs.copySync('src/styles/app.css', 'dist/styles/app.css');
    }
  };
}

export default defineConfig({
  plugins: [
    vue(),
    chromeExtension(),
    copyLocales(),
    copyStyles()
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        manifest: resolve(__dirname, 'src/manifest.json')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});