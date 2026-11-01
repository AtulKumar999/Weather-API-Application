/**
 * SkyPulse Weather Application - UI Controller & Renderer
 * Handles DOM manipulation, SVG weather iconography, skeleton states,
 * dynamic theme adaptation, and defensive data rendering.
 */

class WeatherUI {
  constructor() {
    this.chartInstance = null;
    this.mapInstance = null;
    this.currentLocationData = null;
    this.cacheDom();
    this.initChart();
  }

  cacheDom() {
    // Inputs & controls
    this.searchInput = document.getElementById('search-input');
    this.searchBtn = document.getElementById('search-btn');
    this.clearBtn = document.getElementById('clear-btn');
    this.geoBtn = document.getElementById('geo-btn');
    this.searchSuggestions = document.getElementById('search-suggestions');
    this.recentSearchesContainer = document.getElementById('recent-searches-list');
    this.unitToggleBtn = document.getElementById('unit-toggle-btn');
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    this.demoBadge = document.getElementById('demo-mode-badge');
    this.offlineBanner = document.getElementById('offline-banner');

    // State containers
    this.loadingView = document.getElementById('view-loading');
    this.errorView = document.getElementById('view-error');
    this.emptyView = document.getElementById('view-empty');
    this.weatherView = document.getElementById('view-weather');

    // Error view elements
    this.errorMessageEl = document.getElementById('error-message');
    this.errorTitleEl = document.getElementById('error-title');
    this.errorIconEl = document.getElementById('error-icon');
    this.retryBtn = document.getElementById('retry-btn');
    this.loadDemoBtn = document.getElementById('load-demo-btn');

    // Empty view elements
    this.emptyQueryEl = document.getElementById('empty-query-text');

    // Hero weather card elements
    this.locationCityEl = document.getElementById('location-city');
    this.locationMetaEl = document.getElementById('location-meta');
    this.localTimeEl = document.getElementById('local-time-clock');
    this.favoriteBtn = document.getElementById('favorite-toggle-btn');
    this.currentTempEl = document.getElementById('current-temperature');
    this.currentTempUnitEl = document.getElementById('current-temp-unit');
    this.currentConditionEl = document.getElementById('current-condition-label');
    this.currentConditionIconEl = document.getElementById('current-condition-icon');
    this.feelsLikeTempEl = document.getElementById('feels-like-temp');
    this.tempHighEl = document.getElementById('temp-high');
    this.tempLowEl = document.getElementById('temp-low');
    this.lastUpdatedEl = document.getElementById('last-updated-text');

    // Metrics grid elements
    this.metricWindEl = document.getElementById('metric-wind-speed');
    this.metricWindUnitEl = document.getElementById('metric-wind-unit');
    this.metricWindCompassEl = document.getElementById('metric-wind-compass');
    this.metricWindArrowEl = document.getElementById('wind-compass-arrow');
    this.metricGustsEl = document.getElementById('metric-wind-gusts');

    this.metricHumidityEl = document.getElementById('metric-humidity');
    this.metricHumidityBarEl = document.getElementById('humidity-progress-bar');
    this.metricHumidityDescEl = document.getElementById('humidity-description');

    this.metricUvEl = document.getElementById('metric-uv-index');
    this.metricUvBadgeEl = document.getElementById('metric-uv-badge');
    this.metricUvDescEl = document.getElementById('metric-uv-desc');

    this.metricPressureEl = document.getElementById('metric-pressure');
    this.metricPressureDescEl = document.getElementById('metric-pressure-desc');

    this.metricPrecipEl = document.getElementById('metric-precipitation');
    this.metricPrecipProbEl = document.getElementById('metric-precip-prob');

    this.metricAqiEl = document.getElementById('metric-aqi');
    this.metricAqiBadgeEl = document.getElementById('metric-aqi-badge');
    this.metricAqiDescEl = document.getElementById('metric-aqi-desc');

    this.metricSunriseEl = document.getElementById('metric-sunrise');
    this.metricSunsetEl = document.getElementById('metric-sunset');
    this.sunProgressFillEl = document.getElementById('sun-progress-fill');

    this.metricVisibilityEl = document.getElementById('metric-visibility');

    // Hourly & Daily containers
    this.hourlyCardsContainer = document.getElementById('hourly-cards-strip');
    this.forecastDaysContainer = document.getElementById('forecast-days-list');
    this.hourlyCanvas = document.getElementById('hourly-trend-canvas');
    this.chartTabBtn = document.getElementById('tab-btn-chart');
    this.cardsTabBtn = document.getElementById('tab-btn-cards');
    this.chartViewContainer = document.getElementById('hourly-chart-container');
    this.cardsViewContainer = document.getElementById('hourly-cards-container');

    // Map container
    this.mapContainer = document.getElementById('weather-map');

    // Toast container
    this.toastContainer = document.getElementById('toast-container');
  }

  initChart() {
    if (this.hourlyCanvas && typeof WeatherChart !== 'undefined') {
      this.chartInstance = new WeatherChart(this.hourlyCanvas);
    }
  }

  /**
   * Switch active view state cleanly
   */
  switchView(activeViewName) {
    const views = {
      loading: this.loadingView,
      error: this.errorView,
      empty: this.emptyView,
      weather: this.weatherView
    };

    Object.entries(views).forEach(([name, el]) => {
      if (!el) return;
      if (name === activeViewName) {
        el.classList.remove('hidden');
        el.setAttribute('aria-hidden', 'false');
      } else {
        el.classList.add('hidden');
        el.setAttribute('aria-hidden', 'true');
      }
    });

    if (activeViewName === 'loading') {
      this.searchBtn?.classList.add('is-loading');
    } else {
      this.searchBtn?.classList.remove('is-loading');
    }
  }

  showLoading() {
    this.switchView('loading');
  }

  showError(message, title = 'Unable to Load Weather Data', onRetry = null) {
    this.switchView('error');
    if (this.errorTitleEl) this.errorTitleEl.textContent = title;
    if (this.errorMessageEl) this.errorMessageEl.textContent = message || 'An unexpected error occurred.';

    if (this.retryBtn && onRetry) {
      this.retryBtn.onclick = onRetry;
      this.retryBtn.classList.remove('hidden');
    }
  }

  showEmpty(query) {
    this.switchView('empty');
    if (this.emptyQueryEl) {
      this.emptyQueryEl.textContent = `"${query || ''}"`;
    }
  }

  /**
   * Main weather rendering function with full defensive property access
   */
  renderWeather(data, preferences = {}) {
    if (!data || !data.current || !data.location) {
      this.showError('Invalid weather data received.', 'Data Formatting Error');
      return;
    }

    this.currentLocationData = data;
    this.switchView('weather');

    // Update ambient background theme based on weather condition
    this.updateAtmosphericAtmosphere(data.current.conditionCategory, data.current.isDay);

    // Update Demo Badge visibility
    if (this.demoBadge) {
      if (data._isDemo || data._isFallback) {
        this.demoBadge.classList.remove('hidden');
      } else {
        this.demoBadge.classList.add('hidden');
      }
    }

    // 1. Render Hero Section
    this.renderHero(data);

    // 2. Render Key Atmospheric Metrics Grid
    this.renderMetrics(data);

    // 3. Render 24-Hour Forecast (Hourly cards + trend chart)
    this.renderHourly(data, preferences);

    // 4. Render 7-Day Daily Forecast
    this.renderDaily(data);

    // 5. Render Interactive Map Pin
    this.renderMap(data.location, data.current);

    // 6. Update Favorite Button Icon
    this.updateFavoriteState(data.location);
  }

  renderHero(data) {
    const loc = data.location || {};
    const cur = data.current || {};
    const daily0 = data.daily?.[0] || {};

    // Location titles
    if (this.locationCityEl) {
      this.locationCityEl.textContent = loc.name || 'Unknown Location';
    }

    if (this.locationMetaEl) {
      const parts = [];
      if (loc.admin1 && loc.admin1 !== loc.name) parts.push(loc.admin1);
      if (loc.country) parts.push(loc.country);
      if (loc.country_code && !loc.country) parts.push(loc.country_code);
      const coordStr = `${Math.abs(loc.latitude).toFixed(2)}°${loc.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(loc.longitude).toFixed(2)}°${loc.longitude >= 0 ? 'E' : 'W'}`;
      parts.push(coordStr);
      this.locationMetaEl.textContent = parts.join(' • ');
    }

    // Local time clock
    if (this.localTimeEl) {
      this.startLocalClock(loc.timezone);
    }

    // Temperature & Condition
    if (this.currentTempEl) {
      this.currentTempEl.textContent = cur.temperature !== null ? Math.round(cur.temperature) : '--';
    }
    if (this.currentTempUnitEl) {
      this.currentTempUnitEl.textContent = cur.units?.temperature || '°C';
    }
    if (this.currentConditionEl) {
      this.currentConditionEl.textContent = cur.conditionLabel || 'Unknown';
    }
    if (this.currentConditionIconEl) {
      this.currentConditionIconEl.innerHTML = this.getWeatherSvg(cur.conditionIcon || 'sun', 72);
    }

    // Feels like and High/Low
    if (this.feelsLikeTempEl) {
      this.feelsLikeTempEl.textContent = cur.apparentTemperature !== null
        ? `${Math.round(cur.apparentTemperature)}${cur.units?.temperature || '°'}`
        : '--';
    }
    if (this.tempHighEl) {
      this.tempHighEl.textContent = daily0.tempMax !== null
        ? `${Math.round(daily0.tempMax)}${cur.units?.temperature || '°'}`
        : '--';
    }
    if (this.tempLowEl) {
      this.tempLowEl.textContent = daily0.tempMin !== null
        ? `${Math.round(daily0.tempMin)}${cur.units?.temperature || '°'}`
        : '--';
    }

    // Last updated
    if (this.lastUpdatedEl) {
      const now = new Date();
      this.lastUpdatedEl.textContent = `Updated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  }

  renderMetrics(data) {
    const cur = data.current || {};
    const daily0 = data.daily?.[0] || {};
    const aqi = data.airQuality;

    // Wind & Direction Compass
    if (this.metricWindEl) {
      this.metricWindEl.textContent = cur.windSpeed !== null ? Math.round(cur.windSpeed) : '--';
    }
    if (this.metricWindUnitEl) {
      this.metricWindUnitEl.textContent = cur.units?.windSpeed || 'km/h';
    }
    if (this.metricWindCompassEl) {
      this.metricWindCompassEl.textContent = cur.windCompass || 'N/A';
    }
    if (this.metricWindArrowEl && cur.windDirection !== null) {
      // Wind direction is from where the wind originates, arrow points in direction it is traveling (+180 deg)
      this.metricWindArrowEl.style.transform = `rotate(${cur.windDirection + 180}deg)`;
    }
    if (this.metricGustsEl) {
      this.metricGustsEl.textContent = cur.windGusts !== null
        ? `Gusts up to ${Math.round(cur.windGusts)} ${cur.units?.windSpeed || 'km/h'}`
        : 'Wind is steady';
    }

    // Humidity
    if (this.metricHumidityEl) {
      this.metricHumidityEl.textContent = cur.humidity !== null ? `${Math.round(cur.humidity)}%` : '--';
    }
    if (this.metricHumidityBarEl && cur.humidity !== null) {
      this.metricHumidityBarEl.style.width = `${Math.min(100, Math.max(0, cur.humidity))}%`;
    }
    if (this.metricHumidityDescEl) {
      const h = cur.humidity ?? 50;
      this.metricHumidityDescEl.textContent = h < 30 ? 'Dry air' : h <= 60 ? 'Comfortable humidity' : 'High humidity';
    }

    // UV Index
    const uv = cur.uvIndex ?? daily0.uvIndexMax ?? null;
    if (this.metricUvEl) {
      this.metricUvEl.textContent = uv !== null ? uv.toFixed(1) : '--';
    }
    if (this.metricUvBadgeEl) {
      const { text, bg, color } = this.getUvBadgeProps(uv);
      this.metricUvBadgeEl.textContent = text;
      this.metricUvBadgeEl.style.backgroundColor = bg;
      this.metricUvBadgeEl.style.color = color;
    }
    if (this.metricUvDescEl) {
      this.metricUvDescEl.textContent = this.getUvAdvice(uv);
    }

    // Pressure
    if (this.metricPressureEl) {
      this.metricPressureEl.textContent = cur.pressure !== null ? `${Math.round(cur.pressure)} hPa` : '--';
    }
    if (this.metricPressureDescEl) {
      const p = cur.pressure ?? 1013;
      this.metricPressureDescEl.textContent = p > 1020 ? 'High pressure (Stable)' : p < 1005 ? 'Low pressure (Stormy)' : 'Normal barometric pressure';
    }

    // Precipitation
    if (this.metricPrecipEl) {
      const amount = cur.precipitation ?? daily0.precipitationSum ?? 0;
      this.metricPrecipEl.textContent = `${amount.toFixed(1)} ${cur.units?.precipitation || 'mm'}`;
    }
    if (this.metricPrecipProbEl) {
      const prob = daily0.precipitationProbabilityMax ?? 0;
      this.metricPrecipProbEl.textContent = `${prob}% chance of rain today`;
    }

    // Air Quality (AQI)
    if (this.metricAqiEl) {
      if (aqi && aqi.usAqi !== null) {
        this.metricAqiEl.textContent = aqi.usAqi;
      } else {
        this.metricAqiEl.textContent = '--';
      }
    }
    if (this.metricAqiBadgeEl) {
      if (aqi && aqi.level) {
        this.metricAqiBadgeEl.textContent = aqi.level.label;
        this.metricAqiBadgeEl.style.backgroundColor = aqi.level.color;
        this.metricAqiBadgeEl.style.color = '#ffffff';
      } else {
        this.metricAqiBadgeEl.textContent = 'Unavailable';
        this.metricAqiBadgeEl.style.backgroundColor = '#94a3b8';
        this.metricAqiBadgeEl.style.color = '#ffffff';
      }
    }
    if (this.metricAqiDescEl) {
      this.metricAqiDescEl.textContent = aqi?.level?.advice || 'Air quality index not available for this station.';
    }

    // Sunrise & Sunset
    const sunriseStr = daily0.sunrise ? this.formatTimeOnly(daily0.sunrise) : '--:--';
    const sunsetStr = daily0.sunset ? this.formatTimeOnly(daily0.sunset) : '--:--';
    if (this.metricSunriseEl) this.metricSunriseEl.textContent = sunriseStr;
    if (this.metricSunsetEl) this.metricSunsetEl.textContent = sunsetStr;

    // Visibility
    if (this.metricVisibilityEl) {
      const visKm = data.hourly?.[0]?.visibility;
      if (visKm !== null && visKm !== undefined) {
        this.metricVisibilityEl.textContent = `${visKm.toFixed(1)} km`;
      } else {
        this.metricVisibilityEl.textContent = '10+ km';
      }
    }
  }

  renderHourly(data, preferences = {}) {
    const hourlyList = data.hourly || [];
    const tempUnit = data.current?.units?.temperature || '°C';

    // 1. Render Horizontal Cards Strip
    if (this.hourlyCardsContainer) {
      this.hourlyCardsContainer.innerHTML = '';
      hourlyList.slice(0, 24).forEach((h, index) => {
        const card = document.createElement('div');
        card.className = `hourly-card ${index === 0 ? 'is-current' : ''}`;
        const timeLabel = index === 0 ? 'Now' : this.formatHourOnly(h.time);
        const tempVal = h.temperature !== null ? `${Math.round(h.temperature)}°` : '--';
        const rainProb = h.precipitationProbability ?? 0;

        card.innerHTML = `
          <span class="hourly-time">${timeLabel}</span>
          <div class="hourly-icon">${this.getWeatherSvg(h.conditionIcon, 32)}</div>
          <span class="hourly-temp">${tempVal}</span>
          <span class="hourly-pop ${rainProb > 0 ? '' : 'is-dry'}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            ${rainProb}%
          </span>
        `;
        this.hourlyCardsContainer.appendChild(card);
      });
    }

    // 2. Render Chart
    if (this.chartInstance) {
      this.chartInstance.setData(hourlyList, { tempUnit });
    }
  }

  renderDaily(data) {
    const dailyList = data.daily || [];
    const tempUnit = data.current?.units?.temperature || '°';

    if (!this.forecastDaysContainer) return;
    this.forecastDaysContainer.innerHTML = '';

    // Calculate global min and max for scaling the visual temperature range bars
    const allMins = dailyList.map(d => d.tempMin).filter(v => v !== null);
    const allMaxs = dailyList.map(d => d.tempMax).filter(v => v !== null);
    const globalMin = Math.min(...allMins, 0);
    const globalMax = Math.max(...allMaxs, 30);
    const globalRange = Math.max(1, globalMax - globalMin);

    dailyList.slice(0, 7).forEach((d, index) => {
      const dayEl = document.createElement('div');
      dayEl.className = 'daily-item';

      const dayName = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : this.formatDayOfWeek(d.date);
      const dateSub = this.formatShortDate(d.date);
      const minVal = d.tempMin !== null ? Math.round(d.tempMin) : '--';
      const maxVal = d.tempMax !== null ? Math.round(d.tempMax) : '--';
      const rainProb = d.precipitationProbabilityMax ?? 0;

      // Range bar calculation
      const leftPct = Math.max(0, Math.min(100, ((d.tempMin - globalMin) / globalRange) * 100));
      const rightPct = Math.max(0, Math.min(100, ((globalMax - d.tempMax) / globalRange) * 100));
      const widthPct = Math.max(8, 100 - leftPct - rightPct);

      dayEl.innerHTML = `
        <div class="daily-col-date">
          <span class="daily-name">${dayName}</span>
          <span class="daily-sub">${dateSub}</span>
        </div>
        <div class="daily-col-icon">
          <div class="daily-weather-icon">${this.getWeatherSvg(d.conditionIcon, 28)}</div>
          <span class="daily-condition-label">${d.conditionLabel}</span>
        </div>
        <div class="daily-col-rain ${rainProb >= 20 ? '' : 'is-dry'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
          <span>${rainProb}%</span>
        </div>
        <div class="daily-col-temps">
          <span class="daily-temp-min">${minVal}°</span>
          <div class="daily-temp-bar-track">
            <div class="daily-temp-bar-fill" style="left:${leftPct}%; width:${widthPct}%;"></div>
          </div>
          <span class="daily-temp-max">${maxVal}°</span>
        </div>
      `;

      this.forecastDaysContainer.appendChild(dayEl);
    });
  }

  renderMap(location, current) {
    if (!this.mapContainer || typeof L === 'undefined') return;

    const lat = location.latitude;
    const lon = location.longitude;

    if (!this.mapInstance) {
      // Initialize Leaflet map
      this.mapInstance = L.map(this.mapContainer, {
        zoomControl: false,
        attributionControl: false,
        dragging: !L.Browser.mobile,
        tap: false
      }).setView([lat, lon], 10);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd'
      }).addTo(this.mapInstance);

      L.control.zoom({ position: 'bottomright' }).addTo(this.mapInstance);
    } else {
      this.mapInstance.setView([lat, lon], 10);
    }

    // Custom marker icon with weather badge
    if (this.currentMapMarker) {
      this.mapInstance.removeLayer(this.currentMapMarker);
    }

    const tempText = current?.temperature !== null ? `${Math.round(current.temperature)}°` : '';
    const markerHtml = `
      <div class="map-weather-pin">
        <span class="pin-temp">${tempText}</span>
        <div class="pin-pulse"></div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: markerHtml,
      className: 'custom-map-icon',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    this.currentMapMarker = L.marker([lat, lon], { icon: customIcon }).addTo(this.mapInstance);
    this.currentMapMarker.bindPopup(`<b>${location.name}</b><br>${current?.conditionLabel || 'Weather station'}`).openPopup();

    setTimeout(() => {
      this.mapInstance?.invalidateSize();
    }, 250);
  }

  /**
   * Clock ticking based on location timezone
   */
  startLocalClock(timezone) {
    if (this.clockInterval) clearInterval(this.clockInterval);

    const updateClock = () => {
      if (!this.localTimeEl) return;
      try {
        const now = new Date();
        const options = {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: timezone === 'auto' ? undefined : timezone
        };
        const timeFormatter = new Intl.DateTimeFormat([], options);
        this.localTimeEl.textContent = `Local Time: ${timeFormatter.format(now)}`;
      } catch {
        this.localTimeEl.textContent = `Local Time: ${new Date().toLocaleTimeString()}`;
      }
    };

    updateClock();
    this.clockInterval = setInterval(updateClock, 1000);
  }

  /**
   * Dynamic atmospheric ambient background
   */
  updateAtmosphericAtmosphere(category, isDay) {
    document.body.classList.remove(
      'weather-clear-day', 'weather-clear-night',
      'weather-cloudy', 'weather-overcast',
      'weather-rain', 'weather-snow', 'weather-storm', 'weather-fog'
    );

    let className = 'weather-clear-day';
    if (!isDay && (category === 'clear' || !category)) {
      className = 'weather-clear-night';
    } else {
      switch (category) {
        case 'clear': className = isDay ? 'weather-clear-day' : 'weather-clear-night'; break;
        case 'cloudy': className = 'weather-cloudy'; break;
        case 'overcast': className = 'weather-overcast'; break;
        case 'rain': className = 'weather-rain'; break;
        case 'snow': className = 'weather-snow'; break;
        case 'storm': className = 'weather-storm'; break;
        case 'fog': className = 'weather-fog'; break;
        default: className = isDay ? 'weather-clear-day' : 'weather-clear-night';
      }
    }

    document.body.classList.add(className);
  }

  /**
   * Autocomplete dropdown rendering
   */
  renderSuggestions(locations, onSelect, activeIndex = -1) {
    if (!this.searchSuggestions) return;

    if (!locations || locations.length === 0) {
      this.searchSuggestions.innerHTML = '';
      this.searchSuggestions.classList.add('hidden');
      return;
    }

    this.searchSuggestions.innerHTML = '';
    locations.forEach((loc, index) => {
      const item = document.createElement('div');
      item.className = `suggestion-item ${index === activeIndex ? 'is-active' : ''}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');

      const countryFlag = loc.country_code ? this.getFlagEmoji(loc.country_code) : '📍';
      const sub = [loc.admin1, loc.country].filter(Boolean).join(', ');

      item.innerHTML = `
        <span class="suggestion-flag">${countryFlag}</span>
        <div class="suggestion-text">
          <span class="suggestion-name">${this.escapeHtml(loc.name)}</span>
          <span class="suggestion-sub">${this.escapeHtml(sub)}</span>
        </div>
        <span class="suggestion-coords">${loc.latitude.toFixed(1)}°, ${loc.longitude.toFixed(1)}°</span>
      `;

      item.addEventListener('click', () => {
        onSelect(loc);
        this.hideSuggestions();
      });

      this.searchSuggestions.appendChild(item);
    });

    this.searchSuggestions.classList.remove('hidden');
  }

  hideSuggestions() {
    if (this.searchSuggestions) {
      this.searchSuggestions.classList.add('hidden');
      this.searchSuggestions.innerHTML = '';
    }
  }

  /**
   * Recent searches pill chips
   */
  renderRecentSearches(searches, onSelect, onClear) {
    if (!this.recentSearchesContainer) return;
    this.recentSearchesContainer.innerHTML = '';

    if (!searches || searches.length === 0) {
      this.recentSearchesContainer.innerHTML = '<span class="recent-empty">No recent searches yet</span>';
      return;
    }

    searches.forEach(loc => {
      const chip = document.createElement('button');
      chip.className = 'recent-chip';
      chip.type = 'button';
      chip.innerHTML = `
        <span class="chip-flag">${loc.country_code ? this.getFlagEmoji(loc.country_code) : '📍'}</span>
        <span class="chip-name">${this.escapeHtml(loc.name)}</span>
      `;
      chip.addEventListener('click', () => onSelect(loc));
      this.recentSearchesContainer.appendChild(chip);
    });

    if (onClear && searches.length > 0) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'recent-clear-btn';
      clearBtn.type = 'button';
      clearBtn.title = 'Clear search history';
      clearBtn.innerHTML = 'Clear';
      clearBtn.addEventListener('click', onClear);
      this.recentSearchesContainer.appendChild(clearBtn);
    }
  }

  /**
   * Toast notification feedback
   */
  showToast(message, type = 'info', duration = 3000) {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `skypulse-toast toast-${type}`;
    toast.textContent = message;

    this.toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  updateFavoriteState(location) {
    if (!this.favoriteBtn || typeof StorageService === 'undefined') return;
    const isFav = StorageService.isFavorite(location);
    this.favoriteBtn.classList.toggle('is-favorited', isFav);
    this.favoriteBtn.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Add to favorites');
    this.favoriteBtn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
  }

  // --- SVG ICON GENERATOR ---

  getWeatherSvg(iconName, size = 32) {
    const s = size;
    switch (iconName) {
      case 'sun':
        return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="svg-weather svg-sun">
          <circle cx="32" cy="32" r="14" fill="#f59e0b" />
          <g stroke="#f59e0b" stroke-width="4" stroke-linecap="round">
            <line x1="32" y1="6" x2="32" y2="12" />
            <line x1="32" y1="52" x2="32" y2="58" />
            <line x1="6" y1="32" x2="12" y2="32" />
            <line x1="52" y1="32" x2="58" y2="32" />
            <line x1="13.6" y1="13.6" x2="17.8" y2="17.8" />
            <line x1="46.2" y1="46.2" x2="50.4" y2="50.4" />
            <line x1="13.6" y1="50.4" x2="17.8" y2="46.2" />
            <line x1="46.2" y1="17.8" x2="50.4" y2="13.6" />
          </g>
        </svg>`;

      case 'moon':
        return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="svg-weather svg-moon">
          <path d="M42 46A20 20 0 0 1 20 22a20 20 0 0 1 2.2-9.1A22 22 0 1 0 51.1 43.8 19.9 19.9 0 0 1 42 46z" fill="#fef08a" />
        </svg>`;

      case 'sun-cloud':
      case 'partly-cloudy':
        return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="svg-weather svg-partly-cloudy">
          <circle cx="26" cy="24" r="11" fill="#f59e0b" />
          <g stroke="#f59e0b" stroke-width="3" stroke-linecap="round">
            <line x1="26" y1="6" x2="26" y2="10" />
            <line x1="8" y1="24" x2="12" y2="24" />
            <line x1="13" y1="11" x2="16" y2="14" />
          </g>
          <path d="M22 48h24a10 10 0 0 0 1.5-19.8A13 13 0 0 0 27 25a12.9 12.9 0 0 0-10 4.8A10 10 0 0 0 22 48z" fill="#cbd5e1" />
        </svg>`;

      case 'moon-cloud':
        return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="svg-weather svg-moon-cloud">
          <path d="M34 22a12 12 0 0 1-1.3 5.4A13 13 0 0 1 23 20a12 12 0 0 1 8-10A14 14 0 0 0 34 22z" fill="#fef08a" />
          <path d="M22 48h24a10 10 0 0 0 1.5-19.8A13 13 0 0 0 27 25a12.9 12.9 0 0 0-10 4.8A10 10 0 0 0 22 48z" fill="#94a3b8" />
        </svg>`;

      case 'cloud':
      case 'overcast':
        return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="svg-weather svg-cloud">
          <path d="M20 48h28a11 11 0 0 0 2-21.8A15 15 0 0 0 26 22a14.9 14.9 0 0 0-11 5.3A11 11 0 0 0 20 48z" fill="#94a3b8" />
        </svg>`;

      case 'fog':
        return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="svg-weather svg-fog">
          <g stroke="#94a3b8" stroke-width="4" stroke-linecap="round">
            <line x1="16" y1="24" x2="48" y2="24" />
            <line x1="12" y1="32" x2="52" y2="32" />
            <line x1="16" y1="40" x2="48" y2="40" />
            <line x1="22" y1="48" x2="42" y2="48" />
          </g>
        </svg>`;

      case 'drizzle':
      case 'rain-light':
        return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="svg-weather svg-rain-light">
          <path d="M20 40h26a10 10 0 0 0 1.5-19.8A13 13 0 0 0 26 17a12.9 12.9 0 0 0-10 4.8A10 10 0 0 0 20 40z" fill="#94a3b8" />
          <g stroke="#38bdf8" stroke-width="3" stroke-linecap="round">
            <line x1="22" y1="46" x2="19" y2="54" class="rain-drop" />
            <line x1="32" y1="46" x2="29" y2="54" class="rain-drop" />
            <line x1="42" y1="46" x2="39" y2="54" class="rain-drop" />
          </g>
        </svg>`;

      case 'rain':
      case 'rain-heavy':
        return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="svg-weather svg-rain">
          <path d="M20 38h26a10 10 0 0 0 1.5-19.8A13 13 0 0 0 26 15a12.9 12.9 0 0 0-10 4.8A10 10 0 0 0 20 38z" fill="#64748b" />
          <g stroke="#0284c7" stroke-width="3.5" stroke-linecap="round">
            <line x1="20" y1="44" x2="16" y2="56" class="rain-drop-fast" />
            <line x1="30" y1="44" x2="26" y2="56" class="rain-drop-fast" />
            <line x1="40" y1="44" x2="36" y2="56" class="rain-drop-fast" />
          </g>
        </svg>`;

      case 'snow':
      case 'snow-heavy':
      case 'sleet':
        return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="svg-weather svg-snow">
          <path d="M20 38h26a10 10 0 0 0 1.5-19.8A13 13 0 0 0 26 15a12.9 12.9 0 0 0-10 4.8A10 10 0 0 0 20 38z" fill="#cbd5e1" />
          <g fill="#38bdf8">
            <circle cx="20" cy="48" r="2.5" />
            <circle cx="32" cy="52" r="3" />
            <circle cx="44" cy="48" r="2.5" />
            <circle cx="26" cy="58" r="2" />
            <circle cx="38" cy="58" r="2" />
          </g>
        </svg>`;

      case 'thunderstorm':
      case 'thunderstorm-hail':
        return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="svg-weather svg-thunder">
          <path d="M20 36h26a10 10 0 0 0 1.5-19.8A13 13 0 0 0 26 13a12.9 12.9 0 0 0-10 4.8A10 10 0 0 0 20 36z" fill="#475569" />
          <polygon points="34,36 24,48 31,48 27,60 41,45 33,45" fill="#facc15" />
        </svg>`;

      default:
        return `<svg width="${s}" height="${s}" viewBox="0 0 64 64" class="svg-weather">
          <circle cx="32" cy="32" r="14" fill="#38bdf8" />
        </svg>`;
    }
  }

  // --- HELPERS ---

  getUvBadgeProps(uv) {
    if (uv === null || uv === undefined) return { text: 'N/A', bg: '#64748b', color: '#fff' };
    if (uv < 3) return { text: 'Low', bg: '#10b981', color: '#fff' };
    if (uv < 6) return { text: 'Moderate', bg: '#f59e0b', color: '#fff' };
    if (uv < 8) return { text: 'High', bg: '#f97316', color: '#fff' };
    if (uv < 11) return { text: 'Very High', bg: '#ef4444', color: '#fff' };
    return { text: 'Extreme', bg: '#7c3aed', color: '#fff' };
  }

  getUvAdvice(uv) {
    if (uv === null || uv === undefined) return 'UV reading unavailable.';
    if (uv < 3) return 'Low danger for the average person. Wear sunglasses on bright days.';
    if (uv < 6) return 'Take precautions: wear SPF 30+ sunscreen, a hat, and seek shade during midday.';
    if (uv < 8) return 'Protection needed: seek shade, wear protective clothing, hat, and sunscreen.';
    if (uv < 11) return 'Extra protection needed: take extra precautions, avoid midday sun.';
    return 'Extreme risk: try to avoid sun exposure between 10 AM and 4 PM.';
  }

  formatHourOnly(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
    } catch {
      return iso.slice(11, 16);
    }
  }

  formatTimeOnly(iso) {
    if (!iso) return '--:--';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return iso.slice(11, 16);
    }
  }

  formatDayOfWeek(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString([], { weekday: 'short' });
    } catch {
      return dateStr;
    }
  }

  formatShortDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '📍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeatherUI;
}
