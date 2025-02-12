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

export default {
  setup() {
    const tabs = ref([])

    const getMessage = (key, substitutions = []) => {
      // 确保 substitutions 是字符串数组
      const subs = Array.isArray(substitutions) 
        ? substitutions.map(String) 
        : [String(substitutions)]
      
      const message = chrome.i18n.getMessage(key, subs)
      if (!message) {
        // 如果获取失败，返回一个后备显示
        if (key === "timeAgoNow") return "now"
        if (key === 'timeAgoMinutes') return `${subs[0]} mins ago`
        if (key === 'timeAgoHours') return `${subs[0]} hrs ago`
        if (key === 'timeAgoDays') return `${subs[0]} days ago`
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