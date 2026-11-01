/**
 * SkyPulse Weather Application - API Service
 * Manages weather fetching, geocoding, reverse geocoding, air quality,
 * network resilience, timeout handling, and offline mock fallback data.
 */

// WMO Weather Interpretation Codes (WW) defined by the World Meteorological Organization
const WMO_CODES = {
  0: { label: 'Clear sky', icon: 'sun', condition: 'clear' },
  1: { label: 'Mainly clear', icon: 'sun-cloud', condition: 'clear' },
  2: { label: 'Partly cloudy', icon: 'partly-cloudy', condition: 'cloudy' },
  3: { label: 'Overcast', icon: 'cloud', condition: 'overcast' },
  45: { label: 'Fog', icon: 'fog', condition: 'fog' },
  48: { label: 'Depositing rime fog', icon: 'fog', condition: 'fog' },
  51: { label: 'Light drizzle', icon: 'drizzle', condition: 'rain' },
  53: { label: 'Moderate drizzle', icon: 'drizzle', condition: 'rain' },
  55: { label: 'Dense drizzle', icon: 'drizzle', condition: 'rain' },
  56: { label: 'Light freezing drizzle', icon: 'sleet', condition: 'snow' },
  57: { label: 'Dense freezing drizzle', icon: 'sleet', condition: 'snow' },
  61: { label: 'Slight rain', icon: 'rain-light', condition: 'rain' },
  63: { label: 'Moderate rain', icon: 'rain', condition: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain-heavy', condition: 'rain' },
  66: { label: 'Light freezing rain', icon: 'sleet', condition: 'snow' },
  67: { label: 'Heavy freezing rain', icon: 'sleet', condition: 'snow' },
  71: { label: 'Slight snow fall', icon: 'snow', condition: 'snow' },
  73: { label: 'Moderate snow fall', icon: 'snow', condition: 'snow' },
  75: { label: 'Heavy snow fall', icon: 'snow-heavy', condition: 'snow' },
  77: { label: 'Snow grains', icon: 'snow', condition: 'snow' },
  80: { label: 'Slight rain showers', icon: 'rain-light', condition: 'rain' },
  81: { label: 'Moderate rain showers', icon: 'rain', condition: 'rain' },
  82: { label: 'Violent rain showers', icon: 'rain-heavy', condition: 'rain' },
  85: { label: 'Slight snow showers', icon: 'snow', condition: 'snow' },
  86: { label: 'Heavy snow showers', icon: 'snow-heavy', condition: 'snow' },
  95: { label: 'Thunderstorm', icon: 'thunderstorm', condition: 'storm' },
  96: { label: 'Thunderstorm with slight hail', icon: 'thunderstorm-hail', condition: 'storm' },
  99: { label: 'Thunderstorm with heavy hail', icon: 'thunderstorm-hail', condition: 'storm' }
};

class WeatherApiService {
  static BASE_GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
  static BASE_WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
  static BASE_AQI_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
  static BASE_REVERSE_GEO_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

  static REQUEST_TIMEOUT_MS = 9000;

  /**
   * Safe fetch with configurable timeout and abort controller
   */
  static async fetchWithTimeout(url, options = {}, timeoutMs = WeatherApiService.REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Merge abort signal if caller also passed one
    let signal = controller.signal;
    if (options.signal) {
      options.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, { ...options, signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `Server returned HTTP status ${response.status} (${response.statusText})`;
        if (response.status === 429) {
          errorMsg = 'Rate limit exceeded. Please wait a moment before trying again.';
        } else if (response.status >= 500) {
          errorMsg = 'Weather data service is temporarily unavailable. Please retry shortly.';
        }
        const error = new Error(errorMsg);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutError = new Error('The request timed out. Please check your internet connection and retry.');
        timeoutError.isTimeout = true;
        throw timeoutError;
      }
      if (!window.navigator.onLine) {
        const offlineError = new Error('You appear to be offline. Check your network connection.');
        offlineError.isOffline = true;
        throw offlineError;
      }
      throw err;
    }
  }

  /**
   * Search for locations matching user query
   */
  static async searchLocations(query, signal = null) {
    const sanitized = String(query || '').trim();
    if (!sanitized || sanitized.length < 2) {
      return [];
    }

    // Check if demo mode is active
    if (WeatherApiService.isDemoMode()) {
      return WeatherApiService.searchDemoLocations(sanitized);
    }

    const url = `${WeatherApiService.BASE_GEOCODE_URL}?name=${encodeURIComponent(sanitized)}&count=8&language=en&format=json`;

    try {
      const data = await WeatherApiService.fetchWithTimeout(url, { signal }, 6000);
      if (!data || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map(item => ({
        id: item.id || `${item.latitude}_${item.longitude}`,
        name: item.name || 'Unknown',
        country: item.country || '',
        country_code: (item.country_code || '').toUpperCase(),
        admin1: item.admin1 || '',
        latitude: item.latitude,
        longitude: item.longitude,
        timezone: item.timezone || 'auto',
        elevation: item.elevation ?? null,
        population: item.population ?? null
      }));
    } catch (err) {
      console.warn('[SkyPulse] Live geocode search failed, checking demo fallback:', err.message);
      // If live search fails due to offline/sandbox, check demo locations
      const fallbackResults = WeatherApiService.searchDemoLocations(sanitized);
      if (fallbackResults.length > 0) {
        return fallbackResults;
      }
      throw err;
    }
  }

  /**
   * Reverse geocode coordinates to find city name
   */
  static async reverseGeocode(latitude, longitude) {
    if (WeatherApiService.isDemoMode()) {
      return {
        name: 'Current Location',
        country: 'Local',
        country_code: '',
        admin1: '',
        latitude,
        longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto'
      };
    }

    try {
      const url = `${WeatherApiService.BASE_REVERSE_GEO_URL}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
      const data = await WeatherApiService.fetchWithTimeout(url, {}, 5000);

      const cityName = data.locality || data.city || data.principalSubdivision || 'Current Location';
      return {
        name: cityName,
        country: data.countryName || '',
        country_code: (data.countryCode || '').toUpperCase(),
        admin1: data.principalSubdivision || '',
        latitude,
        longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto'
      };
    } catch (err) {
      console.warn('[SkyPulse] Reverse geocoding failed, using coordinates label:', err);
      return {
        name: `Lat: ${latitude.toFixed(2)}°, Lon: ${longitude.toFixed(2)}°`,
        country: '',
        country_code: '',
        admin1: '',
        latitude,
        longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto'
      };
    }
  }

  /**
   * Fetch comprehensive weather data for coordinates
   */
  static async fetchWeather(location, units = 'metric', signal = null) {
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      throw new Error('Valid latitude and longitude coordinates are required.');
    }

    if (WeatherApiService.isDemoMode()) {
      return WeatherApiService.getDemoWeatherData(location, units);
    }

    const tempUnit = units === 'imperial' ? 'fahrenheit' : 'celsius';
    const windUnit = units === 'imperial' ? 'mph' : 'kmh';
    const precipUnit = units === 'imperial' ? 'inch' : 'mm';

    const params = new URLSearchParams({
      latitude: location.latitude,
      longitude: location.longitude,
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'is_day',
        'precipitation',
        'rain',
        'showers',
        'snowfall',
        'weather_code',
        'cloud_cover',
        'pressure_msl',
        'surface_pressure',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'uv_index'
      ].join(','),
      hourly: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation_probability',
        'precipitation',
        'weather_code',
        'pressure_msl',
        'wind_speed_10m',
        'wind_direction_10m',
        'uv_index',
        'visibility'
      ].join(','),
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'apparent_temperature_max',
        'apparent_temperature_min',
        'sunrise',
        'sunset',
        'uv_index_max',
        'precipitation_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max'
      ].join(','),
      temperature_unit: tempUnit,
      wind_speed_unit: windUnit,
      precipitation_unit: precipUnit,
      timezone: location.timezone || 'auto',
      forecast_days: 7
    });

    const weatherUrl = `${WeatherApiService.BASE_WEATHER_URL}?${params.toString()}`;

    try {
      // Primary weather forecast fetch
      const weatherData = await WeatherApiService.fetchWithTimeout(weatherUrl, { signal });

      // Secondary Air Quality fetch (defensive: doesn't break app if unavailable)
      let airQualityData = null;
      try {
        const aqiUrl = `${WeatherApiService.BASE_AQI_URL}?latitude=${location.latitude}&longitude=${location.longitude}&current=european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`;
        airQualityData = await WeatherApiService.fetchWithTimeout(aqiUrl, { signal }, 5000);
      } catch (aqiErr) {
        console.info('[SkyPulse] Air quality data unavailable for this location:', aqiErr.message);
      }

      return WeatherApiService.processApiResponse(location, weatherData, airQualityData, units);
    } catch (err) {
      console.warn('[SkyPulse] Weather fetch failed, attempting demo fallback:', err.message);
      // If network fails, offer demo data fallback seamlessly
      if (err.isOffline || err.isTimeout || !window.navigator.onLine) {
        // Return demo data if user requested demo or if live call failed and location matches demo
        const demo = WeatherApiService.getDemoWeatherData(location, units);
        demo._isFallback = true;
        return demo;
      }
      throw err;
    }
  }

  /**
   * Process raw Open-Meteo response into safe, defensive model
   */
  static processApiResponse(location, rawWeather, rawAqi, units = 'metric') {
    const cur = rawWeather.current || {};
    const curUnits = rawWeather.current_units || {};
    const daily = rawWeather.daily || {};
    const hourly = rawWeather.hourly || {};

    // Weather metadata
    const weatherCode = cur.weather_code ?? 0;
    const weatherMeta = WeatherApiService.getWeatherMeta(weatherCode, cur.is_day !== 0);

    // Current conditions
    const current = {
      time: cur.time || new Date().toISOString(),
      isDay: cur.is_day === 1,
      temperature: WeatherApiService.safeNumber(cur.temperature_2m),
      apparentTemperature: WeatherApiService.safeNumber(cur.apparent_temperature),
      humidity: WeatherApiService.safeNumber(cur.relative_humidity_2m),
      weatherCode: weatherCode,
      conditionLabel: weatherMeta.label,
      conditionIcon: weatherMeta.icon,
      conditionCategory: weatherMeta.condition,
      windSpeed: WeatherApiService.safeNumber(cur.wind_speed_10m),
      windDirection: WeatherApiService.safeNumber(cur.wind_direction_10m),
      windGusts: WeatherApiService.safeNumber(cur.wind_gusts_10m),
      windCompass: WeatherApiService.degreesToCompass(cur.wind_direction_10m),
      pressure: WeatherApiService.safeNumber(cur.pressure_msl ?? cur.surface_pressure),
      precipitation: WeatherApiService.safeNumber(cur.precipitation),
      cloudCover: WeatherApiService.safeNumber(cur.cloud_cover),
      uvIndex: WeatherApiService.safeNumber(cur.uv_index),
      units: {
        temperature: curUnits.temperature_2m || (units === 'imperial' ? '°F' : '°C'),
        windSpeed: curUnits.wind_speed_10m || (units === 'imperial' ? 'mph' : 'km/h'),
        precipitation: curUnits.precipitation || (units === 'imperial' ? 'in' : 'mm'),
        pressure: curUnits.pressure_msl || 'hPa'
      }
    };

    // 7-day daily forecast
    const dailyList = [];
    const dailyTimes = daily.time || [];
    for (let i = 0; i < dailyTimes.length; i++) {
      const dayCode = (daily.weather_code && daily.weather_code[i]) ?? 0;
      const dayMeta = WeatherApiService.getWeatherMeta(dayCode, true);

      dailyList.push({
        date: dailyTimes[i],
        weatherCode: dayCode,
        conditionLabel: dayMeta.label,
        conditionIcon: dayMeta.icon,
        tempMax: WeatherApiService.safeNumber(daily.temperature_2m_max?.[i]),
        tempMin: WeatherApiService.safeNumber(daily.temperature_2m_min?.[i]),
        apparentMax: WeatherApiService.safeNumber(daily.apparent_temperature_max?.[i]),
        apparentMin: WeatherApiService.safeNumber(daily.apparent_temperature_min?.[i]),
        sunrise: daily.sunrise?.[i] || null,
        sunset: daily.sunset?.[i] || null,
        uvIndexMax: WeatherApiService.safeNumber(daily.uv_index_max?.[i]),
        precipitationSum: WeatherApiService.safeNumber(daily.precipitation_sum?.[i]),
        precipitationProbabilityMax: WeatherApiService.safeNumber(daily.precipitation_probability_max?.[i]),
        windSpeedMax: WeatherApiService.safeNumber(daily.wind_speed_10m_max?.[i])
      });
    }

    // Hourly forecast (next 24-48 hours starting from closest current hour)
    const hourlyList = [];
    const hourlyTimes = hourly.time || [];
    const nowIsoHour = (cur.time || new Date().toISOString()).slice(0, 13);
    let startIndex = hourlyTimes.findIndex(t => t.startsWith(nowIsoHour));
    if (startIndex < 0) startIndex = 0;

    const maxHours = Math.min(startIndex + 24, hourlyTimes.length);
    for (let i = startIndex; i < maxHours; i++) {
      const hCode = hourly.weather_code?.[i] ?? 0;
      const hMeta = WeatherApiService.getWeatherMeta(hCode, true);
      hourlyList.push({
        time: hourlyTimes[i],
        temperature: WeatherApiService.safeNumber(hourly.temperature_2m?.[i]),
        apparentTemperature: WeatherApiService.safeNumber(hourly.apparent_temperature?.[i]),
        humidity: WeatherApiService.safeNumber(hourly.relative_humidity_2m?.[i]),
        weatherCode: hCode,
        conditionLabel: hMeta.label,
        conditionIcon: hMeta.icon,
        precipitationProbability: WeatherApiService.safeNumber(hourly.precipitation_probability?.[i]),
        precipitation: WeatherApiService.safeNumber(hourly.precipitation?.[i]),
        windSpeed: WeatherApiService.safeNumber(hourly.wind_speed_10m?.[i]),
        uvIndex: WeatherApiService.safeNumber(hourly.uv_index?.[i]),
        visibility: WeatherApiService.safeNumber(hourly.visibility?.[i] ? hourly.visibility[i] / 1000 : null) // km
      });
    }

    // Air Quality processing
    let airQuality = null;
    if (rawAqi && rawAqi.current) {
      const a = rawAqi.current;
      const usAqi = a.us_aqi ?? a.european_aqi ?? null;
      airQuality = {
        usAqi: WeatherApiService.safeNumber(usAqi),
        europeanAqi: WeatherApiService.safeNumber(a.european_aqi),
        pm2_5: WeatherApiService.safeNumber(a.pm2_5),
        pm10: WeatherApiService.safeNumber(a.pm10),
        nitrogenDioxide: WeatherApiService.safeNumber(a.nitrogen_dioxide),
        sulphurDioxide: WeatherApiService.safeNumber(a.sulphur_dioxide),
        ozone: WeatherApiService.safeNumber(a.ozone),
        carbonMonoxide: WeatherApiService.safeNumber(a.carbon_monoxide),
        level: WeatherApiService.getAqiLevel(usAqi)
      };
    }

    return {
      location: {
        name: location.name,
        country: location.country,
        country_code: location.country_code,
        admin1: location.admin1,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: rawWeather.timezone || location.timezone || 'auto',
        timezoneAbbreviation: rawWeather.timezone_abbreviation || '',
        elevation: rawWeather.elevation ?? null
      },
      current,
      daily: dailyList,
      hourly: hourlyList,
      airQuality,
      fetchedAt: new Date().toISOString(),
      units
    };
  }

  /**
   * Safe number fallback
   */
  static safeNumber(val) {
    if (val === null || val === undefined || isNaN(Number(val))) {
      return null;
    }
    return Number(val);
  }

  /**
   * Convert wind direction degrees to compass cardinal name
   */
  static degreesToCompass(deg) {
    if (deg === null || deg === undefined || isNaN(deg)) return 'N/A';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round((deg % 360) / 22.5) % 16;
    return directions[index];
  }

  /**
   * Map WMO code to human description & visual icon name
   */
  static getWeatherMeta(code, isDay = true) {
    const defaultMeta = { label: 'Clear sky', icon: isDay ? 'sun' : 'moon', condition: 'clear' };
    const meta = WMO_CODES[code] || defaultMeta;

    let icon = meta.icon;
    if (!isDay) {
      if (icon === 'sun') icon = 'moon';
      if (icon === 'sun-cloud') icon = 'moon-cloud';
    }

    return {
      label: meta.label,
      icon: icon,
      condition: meta.condition
    };
  }

  /**
   * Calculate AQI qualitative category and health guidance
   */
  static getAqiLevel(aqi) {
    if (aqi === null || aqi === undefined) return { label: 'Unknown', color: '#94a3b8', advice: 'No air quality data available.' };
    if (aqi <= 50) {
      return { label: 'Good', color: '#10b981', advice: 'Air quality is satisfactory and poses little or no risk.' };
    }
    if (aqi <= 100) {
      return { label: 'Moderate', color: '#f59e0b', advice: 'Air quality is acceptable for most people.' };
    }
    if (aqi <= 150) {
      return { label: 'Sensitive', color: '#f97316', advice: 'Members of sensitive groups may experience health effects.' };
    }
    if (aqi <= 200) {
      return { label: 'Unhealthy', color: '#ef4444', advice: 'Everyone may begin to experience health effects.' };
    }
    if (aqi <= 300) {
      return { label: 'Very Unhealthy', color: '#8b5cf6', advice: 'Health alert: risk of health effects increased for everyone.' };
    }
    return { label: 'Hazardous', color: '#7c2d12', advice: 'Health warnings of emergency conditions.' };
  }

  // --- DEMO & OFFLINE DATA MODE ---

  static isDemoMode() {
    return window.SKY_PULSE_DEMO_MODE === true;
  }

  static setDemoMode(active) {
    window.SKY_PULSE_DEMO_MODE = !!active;
  }

  static DEMO_PRESETS = [
    {
      id: 'demo-london',
      name: 'London',
      country: 'United Kingdom',
      country_code: 'GB',
      admin1: 'England',
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: 'Europe/London'
    },
    {
      id: 'demo-tokyo',
      name: 'Tokyo',
      country: 'Japan',
      country_code: 'JP',
      admin1: 'Tokyo Prefecture',
      latitude: 35.6895,
      longitude: 139.6917,
      timezone: 'Asia/Tokyo'
    },
    {
      id: 'demo-newyork',
      name: 'New York',
      country: 'United States',
      country_code: 'US',
      admin1: 'New York',
      latitude: 40.7128,
      longitude: -74.0060,
      timezone: 'America/New_York'
    },
    {
      id: 'demo-paris',
      name: 'Paris',
      country: 'France',
      country_code: 'FR',
      admin1: 'Île-de-France',
      latitude: 48.8566,
      longitude: 2.3522,
      timezone: 'Europe/Paris'
    },
    {
      id: 'demo-sydney',
      name: 'Sydney',
      country: 'Australia',
      country_code: 'AU',
      admin1: 'New South Wales',
      latitude: -33.8688,
      longitude: 151.2093,
      timezone: 'Australia/Sydney'
    },
    {
      id: 'demo-cairo',
      name: 'Cairo',
      country: 'Egypt',
      country_code: 'EG',
      admin1: 'Cairo Governorate',
      latitude: 30.0444,
      longitude: 31.2357,
      timezone: 'Africa/Cairo'
    }
  ];

  static searchDemoLocations(query) {
    const q = query.toLowerCase();
    return WeatherApiService.DEMO_PRESETS.filter(
      p => p.name.toLowerCase().includes(q) || p.country.toLowerCase().includes(q)
    );
  }

  static getDemoWeatherData(location, units = 'metric') {
    const isImperial = units === 'imperial';
    const baseC = location.name.toLowerCase().includes('cairo') ? 28
      : location.name.toLowerCase().includes('tokyo') ? 18
        : location.name.toLowerCase().includes('new york') ? 15
          : location.name.toLowerCase().includes('sydney') ? 22
            : 14;

    const tempUnit = isImperial ? '°F' : '°C';
    const windUnit = isImperial ? 'mph' : 'km/h';
    const precipUnit = isImperial ? 'in' : 'mm';

    const temp = isImperial ? Math.round((baseC * 9 / 5) + 32) : baseC;
    const feels = isImperial ? temp + 1 : baseC - 1;
    const now = new Date();

    const hourly = [];
    for (let i = 0; i < 24; i++) {
      const hourDate = new Date(now.getTime() + i * 3600000);
      const hourIso = hourDate.toISOString().slice(0, 16);
      const cycleTemp = temp + Math.sin(i / 3) * 4;
      hourly.push({
        time: hourIso,
        temperature: Math.round(cycleTemp),
        apparentTemperature: Math.round(cycleTemp - 1),
        humidity: 62 + Math.round(Math.sin(i / 2) * 10),
        weatherCode: i % 5 === 0 ? 2 : 1,
        conditionLabel: i % 5 === 0 ? 'Partly cloudy' : 'Mainly clear',
        conditionIcon: (hourDate.getHours() >= 6 && hourDate.getHours() < 19) ? 'sun-cloud' : 'moon-cloud',
        precipitationProbability: Math.min(100, Math.max(0, Math.round(15 + Math.sin(i) * 20))),
        precipitation: 0.1,
        windSpeed: Math.round(12 + Math.cos(i) * 4),
        uvIndex: (hourDate.getHours() >= 10 && hourDate.getHours() <= 16) ? 5 : 0,
        visibility: 10
      });
    }

    const daily = [];
    const days = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    for (let i = 0; i < 7; i++) {
      const dDate = new Date(now.getTime() + i * 86400000);
      const dIso = dDate.toISOString().slice(0, 10);
      daily.push({
        date: dIso,
        dayLabel: days[i],
        weatherCode: (i % 3 === 0) ? 61 : (i % 2 === 0 ? 2 : 1),
        conditionLabel: (i % 3 === 0) ? 'Moderate rain' : (i % 2 === 0 ? 'Partly cloudy' : 'Mainly clear'),
        conditionIcon: (i % 3 === 0) ? 'rain' : (i % 2 === 0 ? 'partly-cloudy' : 'sun'),
        tempMax: temp + 3 - i % 2,
        tempMin: temp - 5 - i % 2,
        apparentMax: temp + 2,
        apparentMin: temp - 6,
        sunrise: `${dIso}T06:34`,
        sunset: `${dIso}T18:48`,
        uvIndexMax: 6,
        precipitationSum: (i % 3 === 0) ? 4.2 : 0,
        precipitationProbabilityMax: (i % 3 === 0) ? 75 : 15,
        windSpeedMax: 18
      });
    }

    return {
      location: {
        name: location.name,
        country: location.country,
        country_code: location.country_code,
        admin1: location.admin1,
        latitude: location.latitude,
        longitude: location.longitude,
        timezone: location.timezone || 'auto',
        timezoneAbbreviation: 'UTC',
        elevation: 25
      },
      current: {
        time: now.toISOString(),
        isDay: true,
        temperature: temp,
        apparentTemperature: feels,
        humidity: 68,
        weatherCode: 2,
        conditionLabel: 'Partly cloudy',
        conditionIcon: 'partly-cloudy',
        conditionCategory: 'cloudy',
        windSpeed: isImperial ? 9 : 14,
        windDirection: 215,
        windGusts: isImperial ? 14 : 22,
        windCompass: 'SW',
        pressure: 1014,
        precipitation: 0.0,
        cloudCover: 45,
        uvIndex: 4.8,
        units: {
          temperature: tempUnit,
          windSpeed: windUnit,
          precipitation: precipUnit,
          pressure: 'hPa'
        }
      },
      daily,
      hourly,
      airQuality: {
        usAqi: 38,
        europeanAqi: 24,
        pm2_5: 8.4,
        pm10: 16.2,
        nitrogenDioxide: 14.1,
        sulphurDioxide: 2.3,
        ozone: 42.0,
        carbonMonoxide: 210,
        level: WeatherApiService.getAqiLevel(38)
      },
      fetchedAt: now.toISOString(),
      units,
      _isDemo: true
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WeatherApiService, WMO_CODES };
}
