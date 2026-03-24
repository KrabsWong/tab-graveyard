import { isDomainBlacklisted, extractDomain } from '../utils/blacklist.js';

/**
 * Background service worker for Tab Graveyard extension.
 * Tracks inactive tabs and persists data to chrome.storage.local.
 */

let domainBlacklist = [];

async function loadBlacklist() {
  try {
    const result = await chrome.storage.local.get(['domainBlacklist']);
    domainBlacklist = result.domainBlacklist || [];
  } catch (error) {
    console.error('Failed to load domain blacklist:', error);
    domainBlacklist = [];
  }
}

loadBlacklist();

chrome.storage.onChanged.addListener((changes) => {
  if (changes.domainBlacklist) {
    domainBlacklist = changes.domainBlacklist.newValue || [];
  }
});

/**
 * Checks if a tab should be tracked based on blacklist
 * @param {chrome.tabs.Tab} tab - Tab to check
 * @returns {boolean} - True if tab should be tracked
 */
function shouldTrackTab(tab) {
  if (!tab.url) return false;
  const domain = extractDomain(tab.url);
  if (!domain) return true;
  return !isDomainBlacklisted(domain, domainBlacklist);
}

// State management
const TabTracker = (() => {
  let data = {};
  let threshold = 10; // Default 10 seconds
  let isDirty = false; // Track if data needs to be saved

  return {
    getData: () => data,
    getThreshold: () => threshold,
    setThreshold: (value) => { threshold = value; },

    /**
     * Sets inactive tab data only if changed
     * @param {number} tabId - Tab ID
     * @param {Object} tabData - Tab data object
     * @returns {boolean} - True if data was changed
     */
    setTab(tabId, tabData) {
      const key = String(tabId);
      const existing = data[key];

      if (!existing ||
          existing.title !== tabData.title ||
          existing.url !== tabData.url ||
          existing.inactiveFrom !== tabData.inactiveFrom) {
        data[key] = tabData;
        isDirty = true;
        return true;
      }
      return false;
    },

    /**
     * Removes tab from tracking
     * @param {number} tabId - Tab ID
     * @returns {boolean} - True if tab was removed
     */
    removeTab(tabId) {
      const key = String(tabId);
      if (data[key]) {
        delete data[key];
        isDirty = true;
        return true;
      }
      return false;
    },

    /**
     * Clears all data
     */
    clear() {
      if (Object.keys(data).length > 0) {
        data = {};
        isDirty = true;
      }
    },

    /**
     * Checks if data needs to be saved
     */
    getIsDirty: () => isDirty,

    /**
     * Marks data as saved
     */
    markClean() {
      isDirty = false;
    },

    /**
     * Loads data from storage object
     */
    loadFromStorage(storedData, storedThreshold) {
      if (storedData && typeof storedData === 'object' && !Array.isArray(storedData)) {
        data = storedData;
      }
      if (typeof storedThreshold === 'number' && storedThreshold > 0) {
        threshold = storedThreshold;
      }
    }
  };
})();

// Restore state from storage on service worker startup
(async function restoreState() {
  try {
    const result = await chrome.storage.local.get(['inactiveTabsData', 'inactiveThreshold']);
    TabTracker.loadFromStorage(result.inactiveTabsData, result.inactiveThreshold);
    console.info('Restored inactive tabs data from storage:', Object.keys(TabTracker.getData()).length, 'tabs');
    console.info('Restored inactive threshold:', TabTracker.getThreshold(), 'seconds');
  } catch (error) {
    console.error('Failed to restore state from storage:', error);
  }
})();

// Set up alarms on service worker startup
chrome.runtime.onStartup.addListener(setupAlarms);
chrome.runtime.onInstalled.addListener(setupAlarms);

// Also setup alarms immediately in case service worker restarts
setupAlarms();

/**
 * Sets up periodic alarms for cleanup and updates
 */
function setupAlarms() {
  chrome.alarms.create('cleanupStaleTabs', { periodInMinutes: 5 });
  chrome.alarms.create('updateInactiveStatus', { periodInMinutes: 1 });
  chrome.alarms.create('periodicSave', { periodInMinutes: 0.5 });
}

// Handle alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  switch (alarm.name) {
    case 'cleanupStaleTabs':
      cleanupStaleTabs();
      break;
    case 'updateInactiveStatus':
      updateInactiveStatus();
      break;
    case 'periodicSave':
      saveInactiveTabsDataIfDirty();
      break;
  }
});

// Get system and browser information
chrome.runtime.getPlatformInfo((info) => {
  if (chrome.runtime.lastError) {
    console.error('Failed to get platform info:', chrome.runtime.lastError);
    return;
  }
  console.info('Platform info:', {
    'Operating System': info.os,
    'Architecture': info.arch
  });
});

// Get browser version information
const browserInfo = {
  'Name': 'Chrome',
  'User Agent': navigator.userAgent,
  'Version': navigator.appVersion,
  'Language': navigator.language,
  'Platform': navigator.platform
};

console.info('Browser info:', browserInfo);

// Listen for tab activation events
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tabs = await chrome.tabs.query({ windowId: activeInfo.windowId });
    const currentTime = Date.now();
    let hasChanges = false;

    tabs.forEach(tab => {
      if (tab.id !== activeInfo.tabId) {
        if (!shouldTrackTab(tab)) return;

        const added = TabTracker.setTab(tab.id, {
          title: tab.title,
          url: tab.url,
          inactiveFrom: currentTime
        });
        if (added) hasChanges = true;
      } else {
        const removed = TabTracker.removeTab(tab.id);
        if (removed) hasChanges = true;
      }
    });

    if (hasChanges) {
      saveInactiveTabsData();
    }
  } catch (error) {
    console.error('Failed to handle tab activation:', error);
  }
});

// Listen for tab removal events to clean up closed tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  const removed = TabTracker.removeTab(tabId);
  if (removed) {
    saveInactiveTabsData();
    console.info('Removed closed tab from tracking:', tabId);
  }
});

// Listen for tab updates to keep title/url fresh
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.title || changeInfo.url) {
    const existing = TabTracker.getData()[tabId];
    if (existing) {
      TabTracker.setTab(tabId, {
        ...existing,
        title: tab.title || existing.title,
        url: tab.url || existing.url
      });
      saveInactiveTabsData();
    }
  }
});

/**
 * Cleans up stale tab data (tabs that no longer exist)
 */
async function cleanupStaleTabs() {
  try {
    // Get all tabs across all windows
    const currentTabs = await chrome.tabs.query({});
    const currentTabIds = new Set(currentTabs.map(tab => tab.id));

    let removedCount = 0;
    const data = TabTracker.getData();
    for (const tabId in data) {
      if (!currentTabIds.has(parseInt(tabId))) {
        TabTracker.removeTab(tabId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      saveInactiveTabsData();
      console.info('Cleaned up stale tabs:', removedCount);
    }
  } catch (error) {
    console.error('Failed to clean up stale tabs:', error);
  }
}

/**
 * Updates inactive tab status (called periodically)
 */
function updateInactiveStatus() {
  // This function can be used to trigger notifications or other logic
  // when tabs have been inactive for too long
  const currentTime = Date.now();
  const threshold = TabTracker.getThreshold() * 1000;
  const data = TabTracker.getData();

  // Check for tabs that have exceeded the threshold
  Object.entries(data).forEach(([tabId, tabData]) => {
    const inactiveDuration = currentTime - tabData.inactiveFrom;
    if (inactiveDuration >= threshold) {
      // Tab has been inactive for the threshold duration
      // Could trigger notification here if needed
    }
  });
}

/**
 * Saves the inactive tabs data to chrome.storage.local for persistence.
 * Called whenever tab tracking data is updated.
 */
function saveInactiveTabsData() {
  const data = TabTracker.getData();
  const threshold = TabTracker.getThreshold();

  chrome.storage.local.set({
    inactiveTabsData: data,
    inactiveThreshold: threshold
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to save inactive tabs data:', chrome.runtime.lastError);
    } else {
      TabTracker.markClean();
    }
  });
}

/**
 * Saves data only if it has been modified (dirty flag check)
 */
function saveInactiveTabsDataIfDirty() {
  if (TabTracker.getIsDirty()) {
    saveInactiveTabsData();
  }
}

// Save data before service worker goes idle
chrome.runtime.onSuspend.addListener(() => {
  if (TabTracker.getIsDirty()) {
    chrome.storage.local.set({
      inactiveTabsData: TabTracker.getData(),
      inactiveThreshold: TabTracker.getThreshold()
    });
  }
});
