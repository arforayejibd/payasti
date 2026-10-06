const db = require('../config/database');

let cachedSettings = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

/**
 * Returns a key-value map of all site settings with in-memory caching
 * @param {boolean} forceRefresh - If true, bypasses cache and queries DB
 * @returns {Promise<Object>}
 */
async function getSiteSettings(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedSettings;
  }

  try {
    const rows = await db.prepare('SELECT `key`, `value` FROM settings').all();
    const map = {};
    if (Array.isArray(rows)) {
      rows.forEach(r => {
        if (r && r.key) {
          map[r.key] = r.value || '';
        }
      });
    }
    cachedSettings = map;
    lastFetchTime = now;
    return cachedSettings;
  } catch (err) {
    console.error('Error fetching site settings:', err);
    return cachedSettings || {};
  }
}

/**
 * Synchronous read of current cached settings (guarantees fast O(1) in middleware/seo)
 * @returns {Object}
 */
function getCachedSettings() {
  if (cachedSettings) return cachedSettings;
  try {
    const rows = db.prepare('SELECT `key`, `value` FROM settings').all();
    const map = {};
    if (Array.isArray(rows)) {
      rows.forEach(r => {
        if (r && r.key) {
          map[r.key] = r.value || '';
        }
      });
    }
    cachedSettings = map;
    lastFetchTime = Date.now();
    return cachedSettings;
  } catch (err) {
    return {};
  }
}

/**
 * Clears in-memory cache so subsequent reads get the freshest DB state
 */
function refreshSiteSettings() {
  cachedSettings = null;
  lastFetchTime = 0;
}

module.exports = {
  getSiteSettings,
  getCachedSettings,
  refreshSiteSettings
};
