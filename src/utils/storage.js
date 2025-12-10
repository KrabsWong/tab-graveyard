/**
 * Storage utility module for Tab Graveyard extension.
 * Provides async wrappers around Chrome storage API for accessing tab tracking data.
 */

export const storage = {
  /**
   * Retrieves inactive tabs data from chrome.storage.local
   * @returns {Promise<Object>} Object containing inactive tab tracking data, empty object if none exists
   */
  async getInactiveTabsData() {
    try {
      const result = await chrome.storage.local.get(['inactiveTabsData']);
      const data = result.inactiveTabsData || {};
      
      // Validate data structure
      if (typeof data !== 'object' || Array.isArray(data)) {
        console.warn('Invalid inactive tabs data structure, returning empty object');
        return {};
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get inactive tabs data:', error);
      return {};
    }
  },

  /**
   * Gets the inactivity threshold setting
   * @returns {Promise<number>} Threshold in seconds, defaults to 10 if not set
   */
  async getInactiveThreshold() {
    try {
      const result = await chrome.storage.local.get(['inactiveThreshold']);
      const threshold = result.inactiveThreshold || 10;
      
      // Validate threshold is a positive number
      if (typeof threshold !== 'number' || threshold <= 0) {
        console.warn('Invalid threshold value, using default: 10');
        return 10;
      }
      
      return threshold;
    } catch (error) {
      console.error('Failed to get inactive threshold:', error);
      return 10;
    }
  },

  /**
   * Sets the inactivity threshold setting
   * @param {number} seconds - Threshold in seconds before a tab is considered inactive
   * @returns {Promise<void>}
   * @throws {TypeError} If seconds is not a positive number
   */
  async setInactiveThreshold(seconds) {
    if (typeof seconds !== 'number' || seconds <= 0 || !Number.isFinite(seconds)) {
      throw new TypeError('Threshold must be a positive number');
    }
    
    await chrome.storage.local.set({ inactiveThreshold: seconds });
  }
}; 