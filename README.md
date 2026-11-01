# SkyPulse | Atmospheric Weather & Forecast Intelligence

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![API: Open--Meteo](https://img.shields.io/badge/API-Open--Meteo-brightgreen.svg)](https://open-meteo.com/)
[![Deployment: Ready](https://img.shields.io/badge/Deploy-GitHub_Pages_|_Vercel_|_Netlify-000000.svg)](https://github.com/)

A modern, highly responsive weather and atmospheric intelligence single-page web application built with vanilla JavaScript, modern CSS, and the Open-Meteo public API. SkyPulse delivers real-time weather observation, 24-hour hourly trend analytics, a 7-day extended forecast, air quality indices (AQI), and an interactive geolocation radar map—all with **zero required API keys**, **zero build dependencies**, and **100% client-side execution**.

---

## Key Features & Requirement Fulfillment

### 1. Query Input & Autocomplete Experience
- **Debounced Live Autocomplete:** 280ms debounce on search input queries the Open-Meteo Geocoding API for instant location suggestions.
- **Full Keyboard Navigation:** Browse dropdown suggestions with `ArrowUp` and `ArrowDown`, press `Enter` to select, and `Escape` to dismiss.
- **Global Shortcut:** Press `/` or `Ctrl + K` anywhere to instantly focus and highlight the search bar.
- **One-Click Geolocation (GPS):** HTML5 `navigator.geolocation` integration automatically retrieves the user's local coordinates with reverse-geocoding fallback.
- **Recent Searches & Favorites:** Stores user search history and favorite locations in `localStorage` with quick chip selectors and a clear button.
- **Popular City Presets:** Instant quick-access buttons for major global metropolises (London, Tokyo, New York, Paris, Sydney, Cairo).

### 2. Dynamic API Data Rendering
- **Hero Condition Overview:** Large readable temperature display, dynamic condition classification, animated SVG iconography, high/low range, "feels like" apparent temperature, and live local ticking clock with timezone offsets.
- **8 Atmospheric Metrics Cards:**
  1. **Wind & Gusts:** Current wind speed, max gusts, and an interactive 360° rotating compass needle.
  2. **Humidity & Comfort:** Relative humidity percentage with a visual progress bar and qualitative comfort descriptor.
  3. **UV Index:** 0–11+ scale with color-coded safety badges (Low, Moderate, High, Extreme) and sun protection advice.
  4. **Barometric Pressure:** Atmospheric pressure in hPa with tendency classification.
  5. **Precipitation:** Real-time precipitation rate and probability.
  6. **Air Quality Index (AQI):** US AQI and European AQI integration with health recommendations and pollutant tracking.
  7. **Sun & Daylight:** Exact sunrise and sunset times formatted in local time.
  8. **Visibility:** Atmospheric visual distance in kilometers.
- **24-Hour Forecast (Timeline & Chart Views):**
  - Horizontal swipeable cards strip with weather icons and rain probability percentages.
  - Interactive HTML5 Canvas trend chart with smooth bezier temperature curves, rain probability bars, high-DPI retina scaling, and hover tooltips.
- **7-Day Daily Forecast:** Day names, dates, condition icons, rain probabilities, and color-gradient min-to-max temperature range indicator bars.
- **Interactive Location Radar Map:** Leaflet.js and OpenStreetMap integration centered on the selected location with a custom temperature marker and radar ripple animation.

### 3. Input Validation & Security
- Prevents empty or whitespace-only queries with accessible toast notifications.
- Enforces minimum query length (at least 2 characters) to prevent unnecessary network requests.
- Strict HTML entity escaping (`escapeHtml`) on all rendered user inputs and external API strings to eliminate Cross-Site Scripting (XSS).

### 4. High-Fidelity Loading Indicators
- Skeleton placeholder screens matching the exact structure of the hero card, metrics grid, and forecast items during API calls.
- Animated button spinners indicating active network requests without layout shift.

### 5. No-Results & Comprehensive Error Handling
- **Dedicated Empty State View:** Clean UI displayed when no cities match the search query, complete with suggestions and alternative preset buttons.
- **Network & HTTP Status Code Handling:** Tailored messages for offline states, 404 Not Found, 429 Rate Limit Exceeded, and 500 Server Errors.
- **Offline Banner:** Automatic listener for `window.addEventListener('online' | 'offline')` providing seamless offline awareness.

### 6. Robust Retry Functionality
- Dedicated **"Retry Request"** button in the error view that remembers the last attempted query or coordinates.
- Seamless fallback to **"Explore with Demo Data"** so users can immediately test the entire application interface even when offline or inside sandboxed environments.

### 7. Defensive Handling of Missing Data
- Safe data navigation using optional chaining and nullish coalescing throughout the codebase (`cur.temperature_2m ?? null`).
- Default placeholders (`--`, `N/A`, `Unknown`) ensure the user interface never crashes if an API field is missing or null.
- Graceful degradation: If secondary data (such as the Air Quality API or reverse geocoding) fails, the main forecast renders uninterrupted.

### 8. Dynamic Theming & Ambient Backgrounds
- **Dark / Light Mode:** Instant toggle with persistence in `localStorage` and system preference detection.
- **Atmospheric Ambience:** Subtle radial background gradients that automatically adapt to the current weather condition (Clear Day, Clear Night, Cloudy, Rain, Thunderstorm, Snow, Fog).

---

## Public API Attribution & Data Sources

This application complies with all public API licensing and attribution requirements:

| Data Provider | Usage | License | Link |
| :--- | :--- | :--- | :--- |
| **Open-Meteo Weather API** | Real-time weather, 24h hourly trends, 7-day forecast | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [open-meteo.com](https://open-meteo.com/) |
| **Open-Meteo Geocoding API** | Global city search, coordinates, admin boundaries | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [open-meteo.com/en/docs/geocoding-api](https://open-meteo.com/en/docs/geocoding-api) |
| **Open-Meteo Air Quality API** | US AQI, European AQI, PM2.5, PM10, Ozone | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [open-meteo.com/en/docs/air-quality-api](https://open-meteo.com/en/docs/air-quality-api) |
| **OpenStreetMap & CartoDB** | Interactive map tiles and geographical data | [ODbL](https://www.openstreetmap.org/copyright) | [openstreetmap.org](https://www.openstreetmap.org/) |
| **World Meteorological Organization (WMO)** | Weather interpretation codes (WW 00–99) | Public Domain Standards | [wmo.int](https://wmo.int/) |

Prominent attribution links are also permanently integrated into the application's footer.

---

## Architecture & File Structure

```
Weather-API-Application/
├── index.html                  # Semantic, accessible HTML5 dashboard structure
├── manifest.json               # Progressive Web App (PWA) manifest
├── vercel.json                 # Vercel deployment & security headers config
├── netlify.toml                # Netlify deployment configuration
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions automated GitHub Pages CI/CD
├── assets/
│   └── favicon.svg             # Vector weather pulse icon & favicon
├── css/
│   └── styles.css              # Responsive styles, glassmorphism, animations
├── js/
│   ├── storage.js              # LocalStorage manager (searches, favorites, units)
│   ├── api.js                  # Open-Meteo API client, geocoding, demo datasets
│   ├── chart.js                # Lightweight retina-sharp canvas trend chart
│   ├── ui.js                   # DOM rendering, SVG generator, view states
│   └── app.js                  # App controller, event delegation, geolocation
└── README.md                   # Full documentation & setup guide
```

---

## Getting Started & Local Development

Because SkyPulse uses standard ES modules and pure client-side web technologies, you do **not** need Node.js, npm, or any build step.

### Option 1: Direct Browser Launch
Simply double-click `index.html` or open it in any modern browser (Chrome, Edge, Firefox, Safari).

### Option 2: Local HTTP Server (Optional)
If you prefer running via a local web server:

**Using Python (if installed):**
```bash
python -m http.server 3000
```
Then visit `http://localhost:3000`.

**Using VS Code Live Server:**
Right click `index.html` and click **"Open with Live Server"**.

---

## Deployment Guide

### Deploying to GitHub Pages
1. Push this repository to GitHub on branch `main`.
2. Go to **Settings > Pages**.
3. Under **Build and deployment > Source**, choose **GitHub Actions** (the provided `.github/workflows/deploy.yml` will automatically build and publish).

### Deploying to Vercel
1. Install the Vercel CLI or import the repository in your [Vercel Dashboard](https://vercel.com).
2. The included `vercel.json` will automatically apply optimized headers and clean routing.

### Deploying to Netlify
1. Import the repository in [Netlify](https://www.netlify.com).
2. The included `netlify.toml` automatically configures publish directories and security headers.

---

## License

This project is open-source and available under the [MIT License](LICENSE).
Weather data is provided by [Open-Meteo](https://open-meteo.com/) under the [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) license.

