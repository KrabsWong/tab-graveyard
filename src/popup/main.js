import { createApp } from 'vue';
import App from './App.vue';
import '../styles/global.css';
import '../styles/app.css';

// 添加调试代码
console.log('Browser Language:', navigator.language);
console.log('Browser Languages:', navigator.languages);
console.log('Chrome API Locale:', chrome.i18n.getUILanguage());

createApp(App).mount('#app');
