export const storage = {
  async getInactiveTabsData() {
    const result = await chrome.storage.local.get(['inactiveTabsData']);
    return result.inactiveTabsData || {};
  },

  async getInactiveThreshold() {
    const result = await chrome.storage.local.get(['inactiveThreshold']);
    return result.inactiveThreshold || 10;
  },

  async setInactiveThreshold(seconds) {
    await chrome.storage.local.set({ inactiveThreshold: seconds });
  }
}; 