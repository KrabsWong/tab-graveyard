/**
 * Background service worker for Tab Graveyard extension.
 * Tracks inactive tabs and persists data to chrome.storage.local.
 */

let inactiveTabsData = {};
let inactiveThreshold = 10; // Default 10 seconds

// Restore state from storage on service worker startup
(async function restoreState() {
  try {
    const result = await chrome.storage.local.get(['inactiveTabsData', 'inactiveThreshold']);
    if (result.inactiveTabsData) {
      inactiveTabsData = result.inactiveTabsData;
      console.info('Restored inactive tabs data from storage:', Object.keys(inactiveTabsData).length, 'tabs');
    }
    if (result.inactiveThreshold) {
      inactiveThreshold = result.inactiveThreshold;
      console.info('Restored inactive threshold:', inactiveThreshold, 'seconds');
    }
  } catch (error) {
    console.error('Failed to restore state from storage:', error);
  }
})();

// Get system and browser information
chrome.runtime.getPlatformInfo(function (info) {
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
  const tabs = await chrome.tabs.query({});
  const currentTime = Date.now();

  tabs.forEach(tab => {
    if (tab.id !== activeInfo.tabId) {
      if (!inactiveTabsData[tab.id]) {
        inactiveTabsData[tab.id] = {
          title: tab.title,
          url: tab.url,
          inactiveFrom: currentTime
        };
      }
    } else {
      delete inactiveTabsData[tab.id];
    }
  });

  // Save data
  saveInactiveTabsData();
});

// Listen for tab removal events to clean up closed tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  if (inactiveTabsData[tabId]) {
    delete inactiveTabsData[tabId];
    saveInactiveTabsData();
    console.info('Removed closed tab from tracking:', tabId);
  }
});

// Periodically clean up stale tab data (every 5 minutes)
setInterval(async () => {
  try {
    const currentTabs = await chrome.tabs.query({});
    const currentTabIds = new Set(currentTabs.map(tab => tab.id));
    
    let removedCount = 0;
    for (const tabId in inactiveTabsData) {
      if (!currentTabIds.has(parseInt(tabId))) {
        delete inactiveTabsData[tabId];
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
}, 5 * 60 * 1000); // 5 minutes

// Periodically check and update inactive tab data
setInterval(async () => {
  const currentTime = Date.now();
  const inactiveThresholdMs = inactiveThreshold * 1000;

  Object.entries(inactiveTabsData).forEach(([tabId, data]) => {
    if (currentTime - data.inactiveFrom >= inactiveThresholdMs) {
      // Update storage
      saveInactiveTabsData();
    }
  });
}, 1000);

/**
 * Saves the inactive tabs data to chrome.storage.local for persistence.
 * Called whenever tab tracking data is updated.
 */
function saveInactiveTabsData() {
  chrome.storage.local.set({ inactiveTabsData });
} 