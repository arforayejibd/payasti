const db = require('../config/database');

let cachedSettings = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 3000; // 3 seconds TTL

/**
 * Fetch all site settings from database (cached in memory)
 */
async function getSiteSettings() {
  const now = Date.now();
  if (cachedSettings && (now - lastFetchTime < CACHE_TTL_MS)) {
    return cachedSettings;
  }

  try {
    const rows = await db.prepare('SELECT `key`, `value` FROM settings').all();
    const map = {};
    if (Array.isArray(rows)) {
      rows.forEach(r => {
        map[r.key] = r.value;
      });
    }
    cachedSettings = map;
    lastFetchTime = now;
    return cachedSettings;
  } catch (err) {
    console.error('Error in getSiteSettings:', err);
    return {};
  }
}

/**
 * Save / Update site settings
 */
async function saveSiteSettings(settingsObj) {
  if (!settingsObj || typeof settingsObj !== 'object') {
    throw new Error('Settings must be an object');
  }

  for (const [key, value] of Object.entries(settingsObj)) {
    if (key === 'header_menu') continue; // header_menu handled separately
    await db.prepare('REPLACE INTO settings (`key`, `value`) VALUES (?, ?)').run(
      key, 
      typeof value === 'string' ? value.trim() : (value ? JSON.stringify(value) : '')
    );
  }

  cachedSettings = null;
  return await getSiteSettings();
}

/**
 * Invalidate memory cache
 */
function clearSettingsCache() {
  cachedSettings = null;
}

module.exports = {
  getSiteSettings,
  saveSiteSettings,
  clearSettingsCache
};
