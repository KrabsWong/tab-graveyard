<template>
  <div class="popup-container">
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
      <div v-else-if="tabs.length === 0" class="empty-state" role="status">
        <div class="empty-state-icon" aria-hidden="true">📭</div>
        <div class="empty-state-text">
          No regular web tabs open
        </div>
        <div class="empty-state-hint">
          All your tabs are browser-internal pages (settings, extensions, etc.)
        </div>
      </div>
      <div 
        v-for="tab in tabs" 
        :key="tab.id" 
        class="tab-item" 
        role="button"
        tabindex="0"
        :aria-label="`Switch to tab: ${tab.title}, last accessed ${formatTime(tab.lastAccessed)}`"
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
        <div :class="['time-badge', getTimeClass(tab.lastAccessed)]" :aria-label="`Last accessed ${formatTime(tab.lastAccessed)}`">
          {{ formatTime(tab.lastAccessed) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import enMessages from '../_locales/en/messages.json'

/**
 * Main popup component for Tab Graveyard extension.
 * Displays all open tabs with their last access time and provides quick tab switching.
 */
export default {
  setup() {
    const tabs = ref([])
    const errorMessage = ref('')
    const isLoading = ref(true)

    /**
     * Gets localized message from Chrome i18n API with fallback to English
     * @param {string} key - Message key from messages.json
     * @param {Array<string>|string} substitutions - Values to substitute in placeholders
     * @returns {string} Localized message or key if not found
     */
    const getMessage = (key, substitutions = []) => {
      // Ensure substitutions is a string array
      const subs = Array.isArray(substitutions) 
        ? substitutions.map(String) 
        : [String(substitutions)]
      
      // Try to get message in current language
      let message = chrome.i18n.getMessage(key, subs)
      
      // If failed, fall back to English language file
      if (!message) {
        const enMessage = enMessages[key]
        if (enMessage?.message) {
          // Process placeholders
          let finalMessage = enMessage.message
          if (subs.length > 0 && enMessage.placeholders) {
            // Iterate through all placeholders
            for (const [name, placeholder] of Object.entries(enMessage.placeholders)) {
              const index = parseInt(placeholder.content.replace('$', '')) - 1
              if (index >= 0 && index < subs.length) {
                // Replace using uppercase placeholder name
                finalMessage = finalMessage.replace(`$${name.toUpperCase()}$`, subs[index])
              }
            }
          }
          return finalMessage
        }
        // If key not found in English file either, return key itself as last resort
        return key
      }
      return message
    }

    /**
     * Returns a default SVG icon for tabs with no favicon
     * @returns {string} Data URI for default icon
     */
    const getDefaultIcon = () => {
      return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>'
    }

    /**
     * Extracts hostname from a URL
     * @param {string} url - Full URL string
     * @returns {string} Hostname or 'unknown' if URL is invalid
     */
    const getHostname = (url) => {
      try {
        return new URL(url).hostname
      } catch {
        return 'unknown'
      }
    }

    /**
     * Checks if a tab is a normal web page (not a browser internal page)
     * @param {Object} tab - Chrome tab object
     * @returns {boolean} True if tab is a normal web page
     */
    const isNormalTab = (tab) => {
      if (!tab.url) return false
      return !tab.url.startsWith('chrome://') && 
             !tab.url.startsWith('chrome-extension://') &&
             !tab.url.startsWith('about:') &&
             tab.url !== 'chrome://newtab/'
    }

    /**
     * Handles image load errors by setting a default icon
     * @param {Event} e - Image error event
     */
    const handleImageError = (e) => {
      e.target.src = getDefaultIcon()
    }

    /**
     * Formats a timestamp into a human-readable relative time string
     * @param {number} timestamp - Unix timestamp in milliseconds
     * @returns {string} Localized relative time (e.g., "5 mins ago", "2 hrs ago")
     */
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

    /**
     * Gets the CSS class name for time badge based on how old the tab is
     * @param {number} timestamp - Unix timestamp in milliseconds
     * @returns {string} CSS class name ('time-now', 'time-recent', 'time-medium', or 'time-old')
     */
    const getTimeClass = (timestamp) => {
      const minutes = Math.floor((Date.now() - timestamp) / 1000 / 60)
      if (minutes < 1) return 'time-now'
      const hours = minutes / 60
      if (hours < 1) return 'time-recent'
      if (hours < 24) return 'time-medium'
      return 'time-old'
    }

    /**
     * Activates (switches to) a tab by its ID
     * @param {number} tabId - Chrome tab ID
     */
    const activateTab = async (tabId) => {
      try {
        await chrome.tabs.update(tabId, { active: true })
      } catch (error) {
        console.error('Failed to activate tab:', tabId, error)
        errorMessage.value = getMessage('tabNoLongerExists') || 'Tab no longer exists'
        
        // Refresh tab list to remove closed tabs
        setTimeout(() => {
          errorMessage.value = ''
          // Reload tabs
          onMounted()
        }, 2000)
      }
    }

    onMounted(async () => {
      try {
        // Fetch all tabs at once - chrome.tabs.query returns lastAccessed
        const allTabs = await chrome.tabs.query({})
        
        // Filter normal tabs and ensure lastAccessed is present
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
        errorMessage.value = 'Failed to load tabs. Please refresh or check permissions.'
        isLoading.value = false
      }
    })

    return {
      tabs,
      errorMessage,
      isLoading,
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