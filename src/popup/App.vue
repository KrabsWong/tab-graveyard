<template>
  <div class="popup-container">
    <div class="header">
      <h1 class="title">{{ getMessage('appName') }}</h1>
      <p class="description">{{ getMessage('appDescription') }}</p>
    </div>
    <div class="tab-list">
      <div v-if="tabs.length === 0" class="no-tabs">
        {{ getMessage('loading') }}
      </div>
      <div v-for="tab in tabs" :key="tab.id" class="tab-item" @click="activateTab(tab.id)">
        <img 
          :src="tab.favIconUrl || getDefaultIcon()" 
          class="favicon" 
          :alt="getHostname(tab.url)"
          @error="handleImageError"
        />
        <div class="tab-content">
          <div class="tab-title" :title="tab.title">
            {{ tab.title }}
          </div>
          <div class="tab-domain">
            {{ getHostname(tab.url) }}
          </div>
        </div>
        <div :class="['time-badge', getTimeClass(tab.lastAccessed)]">
          {{ formatTime(tab.lastAccessed) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import enMessages from '../_locales/en/messages.json'

export default {
  setup() {
    const tabs = ref([])

    const getMessage = (key, substitutions = []) => {
      // 确保 substitutions 是字符串数组
      const subs = Array.isArray(substitutions) 
        ? substitutions.map(String) 
        : [String(substitutions)]
      
      // 尝试使用当前语言获取消息
      let message = chrome.i18n.getMessage(key, subs)
      
      // 如果获取失败，从英文语言文件获取
      if (!message) {
        const enMessage = enMessages[key]
        if (enMessage?.message) {
          // 处理占位符
          let finalMessage = enMessage.message
          if (subs.length > 0 && enMessage.placeholders) {
            // 遍历所有占位符
            for (const [name, placeholder] of Object.entries(enMessage.placeholders)) {
              const index = parseInt(placeholder.content.replace('$', '')) - 1
              if (index >= 0 && index < subs.length) {
                // 使用大写的占位符名称进行替换
                finalMessage = finalMessage.replace(`$${name.toUpperCase()}$`, subs[index])
              }
            }
          }
          return finalMessage
        }
        // 如果英文文件中也没有对应的key，返回key本身作为最后的兜底
        return key
      }
      return message
    }

    const getDefaultIcon = () => {
      return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>'
    }

    const getHostname = (url) => {
      try {
        return new URL(url).hostname
      } catch {
        return 'unknown'
      }
    }

    const isNormalTab = (tab) => {
      if (!tab.url) return false
      return !tab.url.startsWith('chrome://') && 
             !tab.url.startsWith('chrome-extension://') &&
             !tab.url.startsWith('about:') &&
             tab.url !== 'chrome://newtab/'
    }

    const handleImageError = (e) => {
      e.target.src = getDefaultIcon()
    }

    const formatTime = (timestamp) => {
      const minutes = Math.floor((Date.now() - timestamp) / 1000 / 60)
      
      if (minutes < 1) {
        return getMessage('timeAgoNow')
      }
      
      if (minutes < 60) {
        const count = minutes.toString()
        return getMessage('timeAgoMinutes', [count])
      }
      
      const hours = Math.floor(minutes / 60)
      if (hours < 24) {
        const count = hours.toString()
        return getMessage('timeAgoHours', [count])
      }
      
      const days = Math.floor(hours / 24)
      const count = days.toString()
      return getMessage('timeAgoDays', [count])
    }

    const getTimeClass = (timestamp) => {
      const minutes = Math.floor((Date.now() - timestamp) / 1000 / 60)
      if (minutes < 1) return 'time-now'
      const hours = minutes / 60
      if (hours < 1) return 'time-recent'
      if (hours < 24) return 'time-medium'
      return 'time-old'
    }

    const activateTab = (tabId) => {
      chrome.tabs.update(tabId, { active: true })
    }

    onMounted(async () => {
      try {
        const queryInfo = {}
        const allTabs = await chrome.tabs.query(queryInfo)
        
        const tabsWithTime = await Promise.all(
          allTabs
            .filter(isNormalTab)
            .map(async (tab) => {
              const details = await chrome.tabs.get(tab.id)
              return {
                ...tab,
                lastAccessed: details.lastAccessed || Date.now()
              }
            })
        )
        
        tabs.value = tabsWithTime.sort((a, b) => b.lastAccessed - a.lastAccessed)
      } catch (error) {
      }
    })

    return {
      tabs,
      formatTime,
      getTimeClass,
      handleImageError,
      getHostname,
      getDefaultIcon,
      activateTab,
      getMessage
    }
  }
}
</script>

<style>
@import '../styles/app.css';
</style> 