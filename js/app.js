/**
 * SkyPulse Weather Application - Main Application Controller
 * Bootstraps modules, manages event delegation, keyboard navigation,
 * geolocation requests, and application lifecycle.
 */

class SkyPulseApp {
  constructor() {
    this.ui = new WeatherUI();
    this.preferences = StorageService.getPreferences();
    this.currentLocation = null;
    this.lastFailedRequest = null;
    this.debounceTimer = null;
    this.selectedSuggestionIndex = -1;
    this.currentSuggestions = [];

    this.init();
  }

  init() {
    // 1. Apply saved theme & units
    this.applyTheme(this.preferences.theme);
    this.updateUnitButtonLabel();

    // 2. Setup event listeners
    this.bindEvents();

    // 3. Render recent searches from storage
    this.refreshRecentSearches();

    // 4. Check initial online/offline status
    this.updateOnlineStatus();

    // 5. Restore last viewed location or load default
    this.bootstrapInitialLocation();
  }

  bindEvents() {
    // Search input typing with debounce for autocomplete suggestions
    this.ui.searchInput?.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      this.toggleClearButton(query.length > 0);

      clearTimeout(this.debounceTimer);
      if (query.length < 2) {
        this.ui.hideSuggestions();
        this.currentSuggestions = [];
        this.selectedSuggestionIndex = -1;
        return;
      }

      this.debounceTimer = setTimeout(() => {
        this.fetchSuggestions(query);
      }, 280);
    });

    // Keyboard navigation in search input (ArrowUp, ArrowDown, Enter, Esc)
    this.ui.searchInput?.addEventListener('keydown', (e) => {
      if (this.currentSuggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.selectedSuggestionIndex = (this.selectedSuggestionIndex + 1) % this.currentSuggestions.length;
          this.ui.renderSuggestions(this.currentSuggestions, (loc) => this.selectLocation(loc), this.selectedSuggestionIndex);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.selectedSuggestionIndex = (this.selectedSuggestionIndex - 1 + this.currentSuggestions.length) % this.currentSuggestions.length;
          this.ui.renderSuggestions(this.currentSuggestions, (loc) => this.selectLocation(loc), this.selectedSuggestionIndex);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (this.selectedSuggestionIndex >= 0 && this.selectedSuggestionIndex < this.currentSuggestions.length) {
            this.selectLocation(this.currentSuggestions[this.selectedSuggestionIndex]);
            return;
          }
        }
        if (e.key === 'Escape') {
          this.ui.hideSuggestions();
          this.selectedSuggestionIndex = -1;
          return;
        }
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleManualSearch();
      }
    });

    // Search button click
    this.ui.searchBtn?.addEventListener('click', () => {
      this.handleManualSearch();
    });

    // Clear search button click
    this.ui.clearBtn?.addEventListener('click', () => {
      if (this.ui.searchInput) {
        this.ui.searchInput.value = '';
        this.ui.searchInput.focus();
      }
      this.toggleClearButton(false);
      this.ui.hideSuggestions();
    });

    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-box-wrapper')) {
        this.ui.hideSuggestions();
      }
    });

    // Geolocation button click
    this.ui.geoBtn?.addEventListener('click', () => {
      this.handleGeolocationRequest();
    });

    // Unit toggle button click (°C / °F)
    this.ui.unitToggleBtn?.addEventListener('click', () => {
      this.toggleUnits();
    });

    // Theme toggle button click (Dark / Light)
    this.ui.themeToggleBtn?.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Favorite button click
    this.ui.favoriteBtn?.addEventListener('click', () => {
      this.handleFavoriteToggle();
    });

    // Retry button click
    this.ui.retryBtn?.addEventListener('click', () => {
      if (this.lastFailedRequest) {
        this.lastFailedRequest();
      } else if (this.currentLocation) {
        this.loadWeatherForLocation(this.currentLocation);
      }
    });

    // Load Demo Data button in error view
    this.ui.loadDemoBtn?.addEventListener('click', () => {
      WeatherApiService.setDemoMode(true);
      const defaultLoc = WeatherApiService.DEMO_PRESETS[0]; // London
      this.loadWeatherForLocation(defaultLoc);
      this.ui.showToast('Demo mode activated with sample data.', 'info');
    });

    // Hourly Forecast Tab toggle (Cards vs Trend Chart)
    this.ui.cardsTabBtn?.addEventListener('click', () => {
      this.ui.cardsTabBtn?.classList.add('is-active');
      this.ui.chartTabBtn?.classList.remove('is-active');
      this.ui.cardsViewContainer?.classList.remove('hidden');
      this.ui.chartViewContainer?.classList.add('hidden');
    });

    this.ui.chartTabBtn?.addEventListener('click', () => {
      this.ui.chartTabBtn?.classList.add('is-active');
      this.ui.cardsTabBtn?.classList.remove('is-active');
      this.ui.chartViewContainer?.classList.remove('hidden');
      this.ui.cardsViewContainer?.classList.add('hidden');
      if (this.ui.chartInstance) {
        this.ui.chartInstance.render();
      }
    });

    // Global keyboard shortcut: press "/" or "Ctrl+K" to focus search
    window.addEventListener('keydown', (e) => {
      if ((e.key === '/' && document.activeElement !== this.ui.searchInput) ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        this.ui.searchInput?.focus();
        this.ui.searchInput?.select();
      }
    });

    // Online & Offline status listeners
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());
  }

  toggleClearButton(show) {
    if (this.ui.clearBtn) {
      if (show) {
        this.ui.clearBtn.classList.remove('hidden');
      } else {
        this.ui.clearBtn.classList.add('hidden');
      }
    }
  }

  async fetchSuggestions(query) {
    try {
      const results = await WeatherApiService.searchLocations(query);
      this.currentSuggestions = results;
      this.selectedSuggestionIndex = -1;
      this.ui.renderSuggestions(results, (loc) => this.selectLocation(loc));
    } catch (err) {
      console.warn('[SkyPulse] Autocomplete fetch error:', err);
    }
  }

  async handleManualSearch() {
    const query = this.ui.searchInput?.value.trim();
    if (!query) {
      this.ui.showToast('Please enter a city or location name to search.', 'warning');
      this.ui.searchInput?.focus();
      return;
    }

    if (query.length < 2) {
      this.ui.showToast('Please enter at least 2 characters.', 'warning');
      return;
    }

    this.ui.hideSuggestions();
    this.ui.showLoading();

    this.lastFailedRequest = () => this.handleManualSearch();

    try {
      const results = await WeatherApiService.searchLocations(query);
      if (!results || results.length === 0) {
        this.ui.showEmpty(query);
        return;
      }

      // Pick the first top match
      const topLocation = results[0];
      await this.loadWeatherForLocation(topLocation);
    } catch (err) {
      this.handleApiError(err);
    }
  }

  selectLocation(location) {
    if (this.ui.searchInput) {
      this.ui.searchInput.value = `${location.name}${location.country ? ', ' + location.country : ''}`;
    }
    this.toggleClearButton(true);
    this.ui.hideSuggestions();
    this.loadWeatherForLocation(location);
  }

  async loadWeatherForLocation(location) {
    if (!location) return;

    this.ui.showLoading();
    this.currentLocation = location;
    this.lastFailedRequest = () => this.loadWeatherForLocation(location);

    try {
      const weatherData = await WeatherApiService.fetchWeather(location, this.preferences.units);

      // Save to recent searches and persist last location
      StorageService.addRecentSearch(location);
      StorageService.setLastLocation(location);
      this.refreshRecentSearches();

      // Render weather data
      this.ui.renderWeather(weatherData, this.preferences);

      if (weatherData._isFallback) {
        this.ui.showToast('Network offline. Showing demonstration data.', 'info');
      }
    } catch (err) {
      this.handleApiError(err);
    }
  }

  handleGeolocationRequest() {
    if (!navigator.geolocation) {
      this.ui.showToast('Geolocation is not supported by your browser.', 'warning');
      return;
    }

    this.ui.showLoading();
    this.ui.showToast('Locating your position...', 'info', 2000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        try {
          const loc = await WeatherApiService.reverseGeocode(lat, lon);
          if (this.ui.searchInput) {
            this.ui.searchInput.value = loc.name;
          }
          this.toggleClearButton(true);
          await this.loadWeatherForLocation(loc);
        } catch (err) {
          console.warn('[SkyPulse] Geolocation geocoding failed:', err);
          const fallbackLoc = {
            name: 'Current Location',
            latitude: lat,
            longitude: lon,
            country: '',
            admin1: '',
            timezone: 'auto'
          };
          await this.loadWeatherForLocation(fallbackLoc);
        }
      },
      (error) => {
        let msg = 'Unable to retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please search for your city above.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'The request to get user location timed out.';
        }
        this.ui.showToast(msg, 'warning');
        // If no weather is currently shown, restore previous or default
        if (this.currentLocation) {
          this.loadWeatherForLocation(this.currentLocation);
        } else {
          this.bootstrapInitialLocation();
        }
      },
      { timeout: 8000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  }

  handleFavoriteToggle() {
    if (!this.currentLocation) return;
    const isNowFav = StorageService.toggleFavorite(this.currentLocation);
    this.ui.updateFavoriteState(this.currentLocation);
    this.ui.showToast(
      isNowFav ? `Saved ${this.currentLocation.name} to favorites!` : `Removed ${this.currentLocation.name} from favorites.`,
      'info'
    );
  }

  toggleUnits() {
    const nextUnit = this.preferences.units === 'metric' ? 'imperial' : 'metric';
    this.preferences = StorageService.updatePreferences({ units: nextUnit });
    this.updateUnitButtonLabel();

    this.ui.showToast(`Switched units to ${nextUnit === 'imperial' ? '°F (Fahrenheit)' : '°C (Celsius)'}`, 'info', 2000);

    if (this.currentLocation) {
      this.loadWeatherForLocation(this.currentLocation);
    }
  }

  updateUnitButtonLabel() {
    if (!this.ui.unitToggleBtn) return;
    const isMetric = this.preferences.units === 'metric';
    this.ui.unitToggleBtn.textContent = isMetric ? '°C' : '°F';
    this.ui.unitToggleBtn.title = isMetric ? 'Units: Celsius (Click for °F)' : 'Units: Fahrenheit (Click for °C)';
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(nextTheme);
    this.preferences = StorageService.updatePreferences({ theme: nextTheme });

    if (this.ui.chartInstance) {
      this.ui.chartInstance.render();
    }
  }

  applyTheme(theme) {
    let effectiveTheme = theme;
    if (theme === 'system' || !theme) {
      effectiveTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    document.documentElement.setAttribute('data-theme', effectiveTheme);
    if (this.ui.themeToggleBtn) {
      this.ui.themeToggleBtn.setAttribute('aria-label', `Toggle theme (currently ${effectiveTheme})`);
    }
  }

  refreshRecentSearches() {
    const searches = StorageService.getRecentSearches();
    this.ui.renderRecentSearches(
      searches,
      (loc) => this.selectLocation(loc),
      () => {
        StorageService.clearRecentSearches();
        this.refreshRecentSearches();
        this.ui.showToast('Search history cleared.', 'info');
      }
    );
  }

  updateOnlineStatus() {
    const isOnline = window.navigator.onLine;
    if (this.ui.offlineBanner) {
      if (isOnline) {
        this.ui.offlineBanner.classList.add('hidden');
      } else {
        this.ui.offlineBanner.classList.remove('hidden');
      }
    }
  }

  handleApiError(err) {
    console.error('[SkyPulse] Error handling request:', err);
    let title = 'Connection Problem';
    let message = err.message || 'Unable to retrieve weather data.';

    if (err.isTimeout) {
      title = 'Request Timed Out';
      message = 'The weather server took too long to respond. Please check your connection and try again.';
    } else if (err.isOffline || !window.navigator.onLine) {
      title = 'You are Offline';
      message = 'No active internet connection was detected. You can retry once connected, or explore with Demo Mode.';
    } else if (err.status === 429) {
      title = 'Rate Limit Reached';
      message = 'Too many requests were made in a short time. Please wait 30 seconds before retrying.';
    }

    this.ui.showError(message, title, () => {
      if (this.lastFailedRequest) {
        this.lastFailedRequest();
      }
    });
  }

  bootstrapInitialLocation() {
    // 1. Check if user already viewed a location previously
    const savedLast = StorageService.getLastLocation();
    if (savedLast) {
      this.loadWeatherForLocation(savedLast);
      return;
    }

    // 2. Default preset: London
    const defaultPreset = WeatherApiService.DEMO_PRESETS[0];
    this.loadWeatherForLocation(defaultPreset);
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.skyPulseApp = new SkyPulseApp();
});
