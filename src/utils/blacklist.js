/**
 * Utility functions for wildcard pattern matching
 */

/**
 * Converts a wildcard pattern to a regular expression
 * @param {string} pattern - Wildcard pattern (e.g., "*.example.com")
 * @returns {RegExp} Regular expression for matching
 */
function wildcardToRegex(pattern) {
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  return new RegExp(`^${regex}$`, 'i');
}

/**
 * Checks if a domain matches a blacklist pattern
 * @param {string} domain - Domain to check (e.g., "sub.example.com")
 * @param {string} pattern - Blacklist pattern (e.g., "*.example.com" or "example.com")
 * @returns {boolean} True if domain matches the pattern
 */
export function matchesBlacklistPattern(domain, pattern) {
  if (!domain || !pattern) return false;

  const normalizedDomain = domain.trim().toLowerCase();
  const normalizedPattern = pattern.trim().toLowerCase();

  if (normalizedDomain === normalizedPattern) {
    return true;
  }

  const regex = wildcardToRegex(normalizedPattern);
  return regex.test(normalizedDomain);
}

/**
 * Checks if a domain is blacklisted
 * @param {string} domain - Domain to check
 * @param {string[]} blacklist - Array of blacklist patterns
 * @returns {boolean} True if domain is blacklisted
 */
export function isDomainBlacklisted(domain, blacklist) {
  if (!domain || !Array.isArray(blacklist) || blacklist.length === 0) {
    return false;
  }

  return blacklist.some(pattern => matchesBlacklistPattern(domain, pattern));
}

/**
 * Extracts domain from a URL
 * @param {string} url - URL to extract domain from
 * @returns {string|null} Domain or null if invalid URL
 */
export function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Validates a blacklist pattern
 * @param {string} pattern - Pattern to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateBlacklistPattern(pattern) {
  if (typeof pattern !== 'string') {
    return { valid: false, error: 'Pattern must be a string' };
  }

  const trimmed = pattern.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Pattern cannot be empty' };
  }

  const validPattern = /^[a-zA-Z0-9.*\-?]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Pattern contains invalid characters' };
  }

  if (trimmed.includes('**')) {
    return { valid: false, error: 'Pattern cannot contain consecutive wildcards' };
  }

  return { valid: true };
}