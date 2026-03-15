import { RESORTS, IMAGE_REFRESH_MS } from './resorts.js';

const grid = document.getElementById('webcamGrid');
const refreshSelect = document.getElementById('refreshInterval');
const refreshBtn = document.getElementById('refreshNow');

let refreshIntervalId = null;
let refreshMs = parseInt(refreshSelect.value, 10) || IMAGE_REFRESH_MS;

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

/** WMO weather code → short label (snow-focused). */
function weatherLabel(code) {
  if (code == null) return '—';
  const map = {
    0: 'Clear',
    1: 'Clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Fog',
    51: 'Drizzle',
    53: 'Drizzle',
    55: 'Drizzle',
    61: 'Rain',
    63: 'Rain',
    65: 'Rain',
    66: 'Freezing rain',
    67: 'Freezing rain',
    71: 'Snow',
    73: 'Snow',
    75: 'Snow',
    77: 'Snow grains',
    80: 'Showers',
    81: 'Showers',
    82: 'Showers',
    85: 'Snow showers',
    86: 'Snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm',
    99: 'Thunderstorm',
  };
  return map[code] ?? '—';
}

function getImageUrl(url) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_=${Date.now()}`;
}

function formatTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatForecastDate(isoDate) {
  const d = new Date(isoDate + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short' });
}

/** Fetch 7-day forecast from Open-Meteo (free, no API key). */
async function fetchForecast(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: 'temperature_2m_max,temperature_2m_min,snowfall_sum,precipitation_sum,weather_code',
    temperature_unit: 'fahrenheit',
    timezone: 'auto',
    forecast_days: '7',
  });
  const res = await fetch(`${OPEN_METEO_BASE}?${params}`);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

function createCard(resort) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = resort.id;

  const header = document.createElement('header');
  header.className = 'card-header';
  header.innerHTML = `
    <h2 class="card-title">${escapeHtml(resort.name)}</h2>
    <div class="card-meta">
      ${resort.region ? `<span class="card-region">${escapeHtml(resort.region)}</span>` : ''}
    </div>
  `;
  card.appendChild(header);

  const feed = document.createElement('div');
  feed.className = 'card-feed';

  if (resort.type === 'iframe') {
    const iframe = document.createElement('iframe');
    iframe.src = resort.url;
    iframe.title = resort.name;
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.allowFullscreen = true;
    feed.appendChild(iframe);
  } else {
    const img = document.createElement('img');
    img.alt = resort.name;
    img.loading = 'lazy';
    img.src = getImageUrl(resort.url);
    img.dataset.originalUrl = resort.url;

    img.onerror = () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder error';
      placeholder.textContent = 'Webcam unavailable';
      feed.appendChild(placeholder);
      img.remove();
    };

    img.onload = () => {
      const updated = card.querySelector('.card-updated');
      if (updated) updated.textContent = `Updated ${formatTime(Date.now())}`;
    };

    feed.appendChild(img);

    const updated = document.createElement('div');
    updated.className = 'card-updated';
    updated.textContent = 'Loading…';
    card.appendChild(feed);
    card.appendChild(updated);
  }

  card.appendChild(feed);

  // Weather forecast (if resort has coordinates)
  if (resort.latitude != null && resort.longitude != null) {
    const forecastEl = document.createElement('div');
    forecastEl.className = 'card-forecast';
    forecastEl.setAttribute('aria-label', '7-day weather forecast');
    forecastEl.innerHTML = '<div class="forecast-loading">Loading forecast…</div>';
    card.appendChild(forecastEl);

    fetchForecast(resort.latitude, resort.longitude)
      .then((data) => {
        const daily = data.daily;
        if (!daily || !daily.time || !daily.time.length) {
          forecastEl.innerHTML = '<div class="forecast-error">No forecast data</div>';
          return;
        }
        forecastEl.innerHTML = '';
        const heading = document.createElement('div');
        heading.className = 'forecast-heading';
        heading.textContent = '7-day forecast';
        forecastEl.appendChild(heading);
        const list = document.createElement('div');
        list.className = 'forecast-days';
        for (let i = 0; i < daily.time.length; i++) {
          const snow = daily.snowfall_sum?.[i] ?? 0;
          const high = daily.temperature_2m_max?.[i];
          const low = daily.temperature_2m_min?.[i];
          const code = daily.weather_code?.[i];
          const row = document.createElement('div');
          row.className = 'forecast-day';
          if (snow > 0) row.classList.add('has-snow');
          row.innerHTML = `
            <span class="forecast-date">${escapeHtml(formatForecastDate(daily.time[i]))}</span>
            <span class="forecast-temps">${high != null ? Math.round(high) + '°' : '—'} / ${low != null ? Math.round(low) + '°' : '—'}</span>
            <span class="forecast-snow" title="Snowfall">${snow > 0 ? snow.toFixed(1) + ' cm' : '—'}</span>
            <span class="forecast-condition">${escapeHtml(weatherLabel(code))}</span>
          `;
          list.appendChild(row);
        }
        forecastEl.appendChild(list);
      })
      .catch(() => {
        forecastEl.innerHTML = '<div class="forecast-error">Forecast unavailable</div>';
      });
  }

  return card;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function render() {
  grid.innerHTML = '';
  RESORTS.forEach((resort) => {
    grid.appendChild(createCard(resort));
  });
}

function refreshAllImages() {
  grid.querySelectorAll('.card-feed img').forEach((img) => {
    if (img.dataset.originalUrl) {
      img.src = getImageUrl(img.dataset.originalUrl);
    }
  });
  grid.querySelectorAll('.card-updated').forEach((el) => {
    el.textContent = `Refreshed ${formatTime(Date.now())}`;
  });
}

function startRefreshInterval() {
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  refreshIntervalId = setInterval(refreshAllImages, refreshMs);
}

refreshSelect.addEventListener('change', () => {
  refreshMs = parseInt(refreshSelect.value, 10);
  startRefreshInterval();
});

refreshBtn.addEventListener('click', () => {
  refreshAllImages();
});

// Initial render and interval
render();
startRefreshInterval();

// Total visits counter (CountAPI — free, no backend)
const visitEl = document.getElementById('visitCount');
if (visitEl) {
  fetch('https://api.countapi.xyz/hit/ski-resorts-webcam/visits')
    .then((r) => r.json())
    .then((data) => {
      if (data.value != null) visitEl.textContent = data.value.toLocaleString();
    })
    .catch(() => {});
}
