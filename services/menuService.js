const db = require('../config/database');
const { NAV_MENU } = require('../config/constants');

let cachedMenu = null;

/**
 * Fetch the active header navigation menu (cached in memory)
 */
async function getNavMenu() {
  if (cachedMenu && Array.isArray(cachedMenu) && cachedMenu.length > 0) {
    return cachedMenu;
  }

  try {
    const row = await db.prepare("SELECT `value` FROM settings WHERE `key` = 'header_menu'").get();
    if (row && row.value !== null && row.value !== undefined) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed)) {
        cachedMenu = parsed;
        return cachedMenu;
      }
    }
  } catch (err) {
    console.error('Error fetching header_menu from settings:', err);
  }

  cachedMenu = NAV_MENU;
  return cachedMenu;
}

/**
 * Save updated navigation menu to settings table and refresh memory cache
 */
async function saveNavMenu(menuItems) {
  if (!Array.isArray(menuItems)) {
    throw new Error('Menu items must be an array');
  }

  const jsonValue = JSON.stringify(menuItems);
  await db.prepare("REPLACE INTO settings (`key`, `value`) VALUES ('header_menu', ?)").run(jsonValue);
  cachedMenu = menuItems;
  return cachedMenu;
}

/**
 * Invalidate memory cache
 */
function clearMenuCache() {
  cachedMenu = null;
}

module.exports = {
  getNavMenu,
  saveNavMenu,
  clearMenuCache
};
