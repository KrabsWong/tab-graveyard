<template>
  <div class="popup-container">
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
        <div class="tab-title" :title="tab.title">
          {{ tab.title }}
        </div>
        <div :class="['tab-time', getTimeClass(tab.lastAccessed)]">
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
      const message = chrome.i18n.getMessage(key, substitutions)
      if (!message) {
        // 如果获取失败，返回一个后备显示
        if (key === "timeAgoNow") return "now"
        if (key === 'timeAgoMinutes') return `${substitutions[0]} mins ago`
        if (key === 'timeAgoHours') return `${substitutions[0]} hrs ago`
        if (key === 'timeAgoDays') return `${substitutions[0]} days ago`
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
      if (minutes < 1) return 'now'
      const hours = minutes / 60
      if (hours < 1) return 'recent'
      if (hours < 24) return 'medium'
      return 'old'
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
.popup-container {
  background-color: #ffffff;
  color: #333333;
  width: 100%;
  height: 100vh;
  min-width: 400px;
  max-width: 600px;
  max-height: 600px;
}

@media (prefers-color-scheme: dark) {
  .popup-container {
    background-color: #1a1a1a;
    color: #e0e0e0;
  }
}

.tab-list {
  height: 100%;
  overflow-y: auto;
  padding: 8px;
  box-sizing: border-box;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}

@media (prefers-color-scheme: dark) {
  ::-webkit-scrollbar-track {
    background: #2a2a2a;
  }

  ::-webkit-scrollbar-thumb {
    background: #555;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #666;
  }
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #eee;
  gap: 12px;
  transition: all 0.2s;
  cursor: pointer;
  border-radius: 6px;
}

@media (prefers-color-scheme: dark) {
  .tab-item {
    border-bottom: 1px solid #333;
  }

  .tab-item:hover {
    background-color: #2a2a2a;
  }
}

.tab-item:hover {
  background-color: #f5f5f5;
}

.tab-title {
  flex: 1;
  font-size: 13px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
}

.favicon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  border-radius: 2px;
}

.tab-time {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  flex-shrink: 0;
  font-weight: 500;
  border: 1px solid transparent;
}

.now {
  background-color: #e1f3d8;
  color: #529b2e;
  border-color: #b3e19d;
}

@media (prefers-color-scheme: dark) {
  .now {
    background-color: rgba(82, 155, 46, 0.15);
    color: #7ec050;
    border-color: #529b2e;
  }
}

.recent {
  background-color: #f0f9eb;
  color: #67c23a;
  border-color: #c2e7b0;
}

.medium {
  background-color: #fdf6ec;
  color: #e6a23c;
  border-color: #f5dab1;
}

.old {
  background-color: #fef0f0;
  color: #f56c6c;
  border-color: #fbc4c4;
}

@media (prefers-color-scheme: dark) {
  .recent {
    background-color: rgba(103, 194, 58, 0.1);
    color: #95d475;
    border-color: #67c23a;
  }

  .medium {
    background-color: rgba(230, 162, 60, 0.1);
    color: #e6a23c;
    border-color: #e6a23c;
  }

  .old {
    background-color: rgba(245, 108, 108, 0.1);
    color: #f56c6c;
    border-color: #f56c6c;
  }
}

.no-tabs {
  padding: 20px;
  text-align: center;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .no-tabs {
    color: #999;
  }
}
</style> 