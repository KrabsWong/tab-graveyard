<template>
  <div class="popup-container">
    <span
      class="settings-icon"
      role="button"
      tabindex="0"
      :aria-label="getMessage('configTitle')"
      @click="showConfig = true"
      @keydown.enter="showConfig = true"
      @keydown.space.prevent="showConfig = true"
    >⚙️</span>
    <div class="header">
      <h1 class="title">{{ getMessage('appName') }}</h1>
      <p class="description">{{ getMessage('appDescription') }}</p>
    </div>
    <div v-if="errorMessage" class="error-message" role="alert">
      {{ errorMessage }}
    </div>
    <div class="tab-list" role="list" aria-label="Open tabs">
      <div v-if="isLoading" class="no-tabs" role="status" aria-live="polite">
        {{ getMessage('loading') }}
      </div>
      <div v-else-if="filteredTabs.length === 0" class="empty-state" role="status">
        <div class="empty-state-icon" aria-hidden="true">📭</div>
        <div class="empty-state-text">
          {{ getMessage('emptyStateTitle') }}
        </div>
        <div class="empty-state-hint">
          {{ getMessage('emptyStateHint') }}
        </div>
      </div>
      <div
        v-for="tab in filteredTabs"
        :key="tab.id"
        class="tab-item"
        role="button"
        tabindex="0"
        :aria-label="getMessage('ariaSwitchToTab', [tab.title, formatTime(tab.lastAccessed)])"
        @click="activateTab(tab.id)"
        @keydown.enter="activateTab(tab.id)"
        @keydown.space.prevent="activateTab(tab.id)"
      >
        <img
          :src="tab.favIconUrl || getDefaultIcon()"
          class="favicon"
          :alt="getHostname(tab.url)"
          loading="lazy"
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
        <div :class="['time-badge', getTimeClass(tab.lastAccessed)]" :aria-label="getMessage('ariaLastAccessed', [formatTime(tab.lastAccessed)])">
          {{ formatTime(tab.lastAccessed) }}
        </div>
      </div>
    </div>

    <BlacklistConfig
      :visible="showConfig"
      @update="onBlacklistUpdate"
      @close="showConfig = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import enMessages from '../_locales/en/messages.json'
import { storage } from '../utils/storage.js'
import { isDomainBlacklisted, extractDomain } from '../utils/blacklist.js'
import BlacklistConfig from './components/BlacklistConfig.vue'

/**
 * @typedef {Object} TabInfo
 * @property {number} id - Tab ID
 * @property {string} title - Tab title
 * @property {string} url - Tab URL
 * @property {number} lastAccessed - Last accessed timestamp
 * @property {string} [favIconUrl] - Favicon URL
 */

/**
 * Main popup component for Tab Graveyard extension.
 * Displays all open tabs with their last access time and provides quick tab switching.
 */
export default {
  components: {
    BlacklistConfig
  },
  setup() {
    const tabs = ref([])
    const errorMessage = ref('')
    const isLoading = ref(true)
    const showConfig = ref(false)
    const blacklist = ref([])

    const filteredTabs = computed(() => {
      if (!blacklist.value.length) return tabs.value

      return tabs.value.filter(tab => {
        const domain = extractDomain(tab.url)
        if (!domain) return true
        return !isDomainBlacklisted(domain, blacklist.value)
      })
    })

    const getMessage = (key, substitutions = []) => {
      const subs = Array.isArray(substitutions)
        ? substitutions.map(String)
        : [String(substitutions)]

      let message = chrome.i18n.getMessage(key, subs)

      if (!message) {
        const enMessage = enMessages[key]
        if (enMessage?.message) {
          let finalMessage = enMessage.message
          if (subs.length > 0 && enMessage.placeholders) {
            for (const [name, placeholder] of Object.entries(enMessage.placeholders)) {
              const index = parseInt(placeholder.content.replace('$', '')) - 1
              if (index >= 0 && index < subs.length) {
                finalMessage = finalMessage.replace(`$${name.toUpperCase()}$`, subs[index])
              }
            }
          }
          return finalMessage
        }
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
      const blockedPrefixes = [
        'chrome://',
        'chrome-extension://',
        'about:',
        'file://',
        'javascript:',
        'data:',
        'edge://',
        'brave://',
        'opera://'
      ]
      return !blockedPrefixes.some(prefix => tab.url.startsWith(prefix))
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

    const activateTab = async (tabId) => {
      try {
        await chrome.tabs.update(tabId, { active: true })
      } catch (error) {
        console.error('Failed to activate tab:', tabId, error)
        errorMessage.value = getMessage('tabNoLongerExists')

        setTimeout(() => {
          errorMessage.value = ''
          loadTabs()
        }, 2000)
      }
    }

    const loadTabs = async () => {
      try {
        isLoading.value = true
        errorMessage.value = ''

        const [allTabs, savedBlacklist] = await Promise.all([
          chrome.tabs.query({}),
          storage.getDomainBlacklist()
        ])

        blacklist.value = savedBlacklist

        const tabsWithTime = allTabs
          .filter(isNormalTab)
          .map(tab => ({
            ...tab,
            lastAccessed: tab.lastAccessed || Date.now()
          }))

        tabs.value = tabsWithTime.sort((a, b) => b.lastAccessed - a.lastAccessed)
        isLoading.value = false
      } catch (error) {
        console.error('Failed to load tabs:', error)
        errorMessage.value = getMessage('loadError')
        isLoading.value = false
      }
    }

    const onBlacklistUpdate = (newBlacklist) => {
      blacklist.value = newBlacklist
    }

    onMounted(loadTabs)

    return {
      tabs,
      filteredTabs,
      errorMessage,
      isLoading,
      showConfig,
      formatTime,
      getTimeClass,
      handleImageError,
      getHostname,
      getDefaultIcon,
      activateTab,
      getMessage,
      loadTabs,
      onBlacklistUpdate
    }
  }
}
</script>

<style>
@import '../styles/app.css';

.popup-container {
  position: relative;
}

.settings-icon {
  position: absolute;
  top: 0;
  right: -8px;
  background: none;
  border: none;
  padding: 4px;
  margin: 0;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  z-index: 10;
  -webkit-appearance: none;
  appearance: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  display: inline-block;
}

.settings-icon:hover {
  opacity: 0.7;
}

.settings-icon:focus {
  outline: none;
}
</style>