/**
 * SkyPulse Weather Application - Storage Service
 * Handles persistence for user preferences, search history, and favorite locations.
 */

const STORAGE_KEYS = {
  PREFERENCES: 'skypulse_preferences',
  RECENT_SEARCHES: 'skypulse_recent_searches',
  FAVORITES: 'skypulse_favorites',
  LAST_LOCATION: 'skypulse_last_location'
};

const DEFAULT_PREFERENCES = {
  units: 'metric', // 'metric' (°C, km/h) or 'imperial' (°F, mph)
  theme: 'system', // 'dark', 'light', or 'system'
  autoGeolocation: false,
  demoMode: false
};

class StorageService {
  /**
   * Safely retrieve an item from localStorage with fallback
   */
  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (err) {
      console.warn(`[SkyPulse Storage] Could not read key "${key}":`, err);
      return defaultValue;
    }
  }

  /**
   * Safely write an item to localStorage
   */
  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`[SkyPulse Storage] Could not write key "${key}":`, err);
      return false;
    }
  }

  /**
   * Get user preferences merged with defaults
   */
  static getPreferences() {
    const saved = this.get(STORAGE_KEYS.PREFERENCES, {});
    return { ...DEFAULT_PREFERENCES, ...saved };
  }

  /**
   * Update user preferences
   */
  static updatePreferences(partial) {
    const current = this.getPreferences();
    const updated = { ...current, ...partial };
    this.set(STORAGE_KEYS.PREFERENCES, updated);
    return updated;
  }

  /**
   * Get recent searches list (ordered most recent first)
   */
  static getRecentSearches() {
    return this.get(STORAGE_KEYS.RECENT_SEARCHES, []);
  }

  /**
   * Add a location to recent searches (deduplicates and limits to 8 items)
   */
  static addRecentSearch(location) {
    if (!location || !location.name) return;
    const history = this.getRecentSearches();

    // Deduplicate based on name and coordinates
    const filtered = history.filter(
      item => !(
        item.name.toLowerCase() === location.name.toLowerCase() &&
        Math.abs(item.latitude - location.latitude) < 0.1 &&
        Math.abs(item.longitude - location.longitude) < 0.1
      )
    );

    const entry = {
      name: location.name,
      country: location.country || '',
      country_code: location.country_code || '',
      admin1: location.admin1 || '',
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      timezone: location.timezone || 'auto',
      searchedAt: new Date().toISOString()
    };

    filtered.unshift(entry);
    const trimmed = filtered.slice(0, 8);
    this.set(STORAGE_KEYS.RECENT_SEARCHES, trimmed);
    return trimmed;
  }

  /**
   * Clear all recent searches
   */
  static clearRecentSearches() {
    this.set(STORAGE_KEYS.RECENT_SEARCHES, []);
  }

  /**
   * Get favorite locations
   */
  static getFavorites() {
    return this.get(STORAGE_KEYS.FAVORITES, []);
  }

  /**
   * Toggle a favorite location
   */
  static toggleFavorite(location) {
    if (!location || !location.name) return false;
    const favorites = this.getFavorites();
    const index = favorites.findIndex(
      item => item.name.toLowerCase() === location.name.toLowerCase() &&
        item.country_code === location.country_code
    );

    let isFav = false;
    if (index > -1) {
      favorites.splice(index, 1);
      isFav = false;
    } else {
      favorites.push({
        name: location.name,
        country: location.country || '',
        country_code: location.country_code || '',
        admin1: location.admin1 || '',
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        timezone: location.timezone || 'auto',
        addedAt: new Date().toISOString()
      });
      isFav = true;
    }

    this.set(STORAGE_KEYS.FAVORITES, favorites);
    return isFav;
  }

  /**
   * Check if a location is already favorited
   */
  static isFavorite(location) {
    if (!location || !location.name) return false;
    const favorites = this.getFavorites();
    return favorites.some(
      item => item.name.toLowerCase() === location.name.toLowerCase() &&
        (item.country_code === location.country_code || !location.country_code)
    );
  }

  /**
   * Save last viewed location for instant restoration on reload
   */
  static setLastLocation(location) {
    if (!location) return;
    this.set(STORAGE_KEYS.LAST_LOCATION, location);
  }

  /**
   * Retrieve last viewed location
   */
  static getLastLocation() {
    return this.get(STORAGE_KEYS.LAST_LOCATION, null);
  }
}

// Export for ES modules and global browser scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageService;
}
