import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');

function formatTime(timestamp) {
  const now = new Date().getTime();
  const diff = now - timestamp;
  const hours = diff / (1000 * 60 * 60);

  let timeClass = '';
  let timeText = '';

  if (hours < 6) {
    timeClass = 'time-recent';
    timeText = hours < 1 ? '刚刚' : `${Math.floor(hours)}h`;
  } else if (hours < 24) {
    timeClass = 'time-today';
    timeText = `${Math.floor(hours)}h`;
  } else {
    timeClass = 'time-old';
    const days = Math.floor(hours / 24);
    timeText = `${days}d`;
  }

  return { timeText, timeClass };
}

function createMessageElement(message) {
  const div = document.createElement('div');
  div.className = 'message-item';

  const { timeText, timeClass } = formatTime(message.timestamp);

  div.innerHTML = `
    <img src="${message.icon}" class="message-icon" alt="icon" />
    <div class="message-content">${message.content}</div>
    <span class="message-time ${timeClass}">${timeText}</span>
  `;

  return div;
} 