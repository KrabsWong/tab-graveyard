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
  },

  /**
   * Gets the domain blacklist
   * @returns {Promise<string[]>} Array of blacklisted domain patterns
   */
  async getDomainBlacklist() {
    try {
      const result = await chrome.storage.local.get(['domainBlacklist']);
      const blacklist = result.domainBlacklist || [];

      if (!Array.isArray(blacklist)) {
        console.warn('Invalid domain blacklist structure, returning empty array');
        return [];
      }

      return blacklist.filter(item => typeof item === 'string' && item.length > 0);
    } catch (error) {
      console.error('Failed to get domain blacklist:', error);
      return [];
    }
  },

  /**
   * Sets the domain blacklist
   * @param {string[]} patterns - Array of domain patterns (supports wildcards like *.example.com)
   * @returns {Promise<void>}
   * @throws {TypeError} If patterns is not an array
   */
  async setDomainBlacklist(patterns) {
    if (!Array.isArray(patterns)) {
      throw new TypeError('Domain blacklist must be an array');
    }

    const sanitized = patterns
      .map(p => p.trim().toLowerCase())
      .filter(p => p.length > 0);

    await chrome.storage.local.set({ domainBlacklist: sanitized });
  },

  /**
   * Adds a domain pattern to the blacklist
   * @param {string} pattern - Domain pattern to add
   * @returns {Promise<void>}
   */
  async addToBlacklist(pattern) {
    if (typeof pattern !== 'string' || pattern.trim().length === 0) {
      throw new TypeError('Pattern must be a non-empty string');
    }

    const current = await this.getDomainBlacklist();
    const normalized = pattern.trim().toLowerCase();

    if (!current.includes(normalized)) {
      current.push(normalized);
      await this.setDomainBlacklist(current);
    }
  },

  /**
   * Removes a domain pattern from the blacklist
   * @param {string} pattern - Domain pattern to remove
   * @returns {Promise<void>}
   */
  async removeFromBlacklist(pattern) {
    const current = await this.getDomainBlacklist();
    const normalized = pattern.trim().toLowerCase();
    const filtered = current.filter(p => p !== normalized);

    await this.setDomainBlacklist(filtered);
  }
}; 