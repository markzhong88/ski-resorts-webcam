import { RESORTS, IMAGE_REFRESH_MS } from './resorts.js';

const grid = document.getElementById('webcamGrid');
const powderBoard = document.getElementById('powderBoard');
const powderList = document.getElementById('powderList');
const refreshSelect = document.getElementById('refreshInterval');
const refreshBtn = document.getElementById('refreshNow');
const regionFilter = document.getElementById('regionFilter');
const sortSelect = document.getElementById('sortBy');
const favoritesOnly = document.getElementById('favoritesOnly');
const resultCount = document.getElementById('resultCount');

const FAV_KEY = 'ski-webcam-favorites';
const PREFS_KEY = 'ski-webcam-prefs';
const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const PAST_DAYS = 2;
const FORECAST_DAYS = 7;

let refreshIntervalId = null;
let refreshMs = parseInt(refreshSelect?.value, 10) || IMAGE_REFRESH_MS;

/** @type {Map<string, object>} snow metrics keyed by mountain */
const snowByMountain = new Map();
/** @type {Set<string>} */
let favorites = loadFavorites();
/** Card elements keyed by resort id — rebuilt on full re-render */
const cardEls = new Map();

function mountainSlug(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mountainPageHref(mountain) {
  const slug = mountainSlug(mountain);
  return slug ? `/mountains/${slug}.html` : '/directory.html';
}

function camsOnMountain(mountain) {
  return RESORTS.filter((r) => (r.mountain || r.id) === mountain).length;
}

/** Only load iframe cams near the viewport (don't start all 20 Roundshots at once). */
let iframeObserver = null;

function ensureIframeObserver() {
  if (iframeObserver) return iframeObserver;
  iframeObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const feed = entry.target;
        const iframe = feed.querySelector('iframe');
        const src = feed.dataset.iframeSrc;
        if (!iframe || !src) continue;
        if (iframe.src && iframe.src !== 'about:blank') continue;

        feed.classList.add('is-loading');
        iframe.src = src;
        iframe.addEventListener(
          'load',
          () => {
            feed.classList.remove('is-loading');
            iframeObserver?.unobserve(feed);
          },
          { once: true }
        );
      }
    },
    { rootMargin: '320px 0px', threshold: 0 }
  );
  return iframeObserver;
}

function observeIframeFeed(feed) {
  ensureIframeObserver().observe(feed);
}

function disconnectIframeObserver() {
  iframeObserver?.disconnect();
  iframeObserver = null;
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
}

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function savePrefs() {
  localStorage.setItem(
    PREFS_KEY,
    JSON.stringify({
      region: regionFilter?.value || 'all',
      sort: sortSelect?.value || 'name',
      favoritesOnly: !!favoritesOnly?.checked,
      refreshMs,
    })
  );
}

function applyPrefs() {
  const prefs = loadPrefs();
  if (regionFilter && prefs.region) regionFilter.value = prefs.region;
  if (sortSelect && prefs.sort) sortSelect.value = prefs.sort;
  if (favoritesOnly && prefs.favoritesOnly != null) favoritesOnly.checked = !!prefs.favoritesOnly;
  if (refreshSelect && prefs.refreshMs) {
    refreshSelect.value = String(prefs.refreshMs);
    refreshMs = prefs.refreshMs;
  }
}

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
  // Ski Utah blob URLs 404 if any query string is present; bust cache via path instead.
  if (/skiutah\.com\/files\/blob\//i.test(url)) {
    return `${url.replace(/\/$/, '')}/${Date.now()}`;
  }
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_=${Date.now()}`;
}

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function cmToIn(cm) {
  return cm / 2.54;
}

function formatSnow(cm) {
  if (cm == null || cm <= 0) return '0″';
  const inches = cmToIn(cm);
  if (inches < 0.5) return '<0.5″';
  return `${inches.toFixed(inches >= 10 ? 0 : 1)}″`;
}

function snowBadge(metrics) {
  if (!metrics) return null;
  const { snowNext48h = 0, snowLast48h = 0 } = metrics;
  if (snowNext48h >= 10) return { label: 'Storm incoming', className: 'badge-storm' };
  if (snowNext48h >= 3) return { label: 'Snow soon', className: 'badge-incoming' };
  if (snowLast48h >= 10) return { label: 'Fresh dump', className: 'badge-fresh' };
  if (snowLast48h >= 3) return { label: 'Recent snow', className: 'badge-recent' };
  return null;
}

/**
 * Parse Open-Meteo daily series with past_days into snow metrics.
 * With past_days=N, indices 0..N-1 are past; index N is today (API local timezone).
 */
function parseSnowMetrics(daily) {
  if (!daily?.time?.length) return null;
  const todayIdx = Math.min(PAST_DAYS, daily.time.length - 1);
  const snow = (i) => Number(daily.snowfall_sum?.[i] ?? 0);

  let snowLast48h = 0;
  for (let i = 0; i < todayIdx; i++) snowLast48h += snow(i);

  // Today + tomorrow (next ~48h including today)
  let snowNext48h = 0;
  for (let i = todayIdx; i < Math.min(todayIdx + 2, daily.time.length); i++) {
    snowNext48h += snow(i);
  }

  let snowNext7d = 0;
  for (let i = todayIdx; i < daily.time.length; i++) snowNext7d += snow(i);

  return {
    daily,
    todayIdx,
    snowLast48h,
    snowNext48h,
    snowNext7d,
  };
}

/** Unique mountain locations for weather batching. */
function uniqueMountainLocations() {
  const map = new Map();
  for (const r of RESORTS) {
    if (r.latitude == null || r.longitude == null) continue;
    const key = r.mountain || r.id;
    if (!map.has(key)) {
      map.set(key, {
        mountain: key,
        region: r.region,
        latitude: r.latitude,
        longitude: r.longitude,
        sampleId: r.id,
      });
    }
  }
  return [...map.values()];
}

async function fetchForecastBatch(locations) {
  if (!locations.length) return [];
  // Open-Meteo accepts comma-separated coords
  const params = new URLSearchParams({
    latitude: locations.map((l) => l.latitude).join(','),
    longitude: locations.map((l) => l.longitude).join(','),
    daily: 'temperature_2m_max,temperature_2m_min,snowfall_sum,precipitation_sum,weather_code',
    temperature_unit: 'fahrenheit',
    timezone: 'auto',
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
  });
  const res = await fetch(`${OPEN_METEO_BASE}?${params}`);
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();
  // Single location returns object; multi returns array-like fields or array of results
  if (Array.isArray(data)) return data;
  if (data.daily) return [data];
  // Multi-location: open-meteo returns parallel arrays at top level when >1? 
  // Actually for multiple locations it returns an array of result objects.
  // Some versions nest under no key — handle both.
  return Array.isArray(data) ? data : [data];
}

async function loadAllSnow() {
  const locations = uniqueMountainLocations();
  snowByMountain.clear();

  // Batch in chunks of 8 to stay within URL limits
  const chunkSize = 8;
  for (let i = 0; i < locations.length; i += chunkSize) {
    const chunk = locations.slice(i, i + chunkSize);
    try {
      const results = await fetchForecastBatch(chunk);
      chunk.forEach((loc, idx) => {
        const result = results[idx] ?? results[0];
        const metrics = parseSnowMetrics(result?.daily);
        if (metrics) {
          snowByMountain.set(loc.mountain, {
            ...metrics,
            region: loc.region,
            sampleId: loc.sampleId,
          });
        }
      });
    } catch (err) {
      console.warn('Powder radar batch failed', err);
      // Fallback: fetch one-by-one for this chunk
      await Promise.all(
        chunk.map(async (loc) => {
          try {
            const params = new URLSearchParams({
              latitude: String(loc.latitude),
              longitude: String(loc.longitude),
              daily:
                'temperature_2m_max,temperature_2m_min,snowfall_sum,precipitation_sum,weather_code',
              temperature_unit: 'fahrenheit',
              timezone: 'auto',
              past_days: String(PAST_DAYS),
              forecast_days: String(FORECAST_DAYS),
            });
            const res = await fetch(`${OPEN_METEO_BASE}?${params}`);
            if (!res.ok) return;
            const data = await res.json();
            const metrics = parseSnowMetrics(data.daily);
            if (metrics) {
              snowByMountain.set(loc.mountain, {
                ...metrics,
                region: loc.region,
                sampleId: loc.sampleId,
              });
            }
          } catch {
            /* ignore single failure */
          }
        })
      );
    }
  }
}

function getMetrics(resort) {
  return snowByMountain.get(resort.mountain || resort.id) || null;
}

function renderPowderBoard() {
  if (!powderList || !powderBoard) return;

  const ranked = [...snowByMountain.entries()]
    .map(([mountain, m]) => ({ mountain, ...m }))
    .sort((a, b) => b.snowNext48h - a.snowNext48h || b.snowLast48h - a.snowLast48h)
    .slice(0, 6);

  powderList.innerHTML = '';
  powderBoard.classList.remove('is-quiet');

  if (!ranked.length) {
    powderList.innerHTML =
      '<p class="powder-empty">Snow data unavailable right now. Cams still work below.</p>';
    powderBoard.hidden = false;
    return;
  }

  const anySnow = ranked.some((m) => m.snowNext48h > 0 || m.snowLast48h > 0);
  if (!anySnow) {
    powderBoard.classList.add('is-quiet');
    const note = document.createElement('p');
    note.className = 'powder-season';
    note.textContent =
      'Quiet mid-season — the model shows no snow right now. Cams below are still live; ranking lights up when storms return.';
    powderList.appendChild(note);
  }

  ranked.forEach((item, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'powder-card';
    btn.dataset.mountain = item.mountain;
    btn.innerHTML = `
      <span class="powder-rank">#${i + 1}</span>
      <span class="powder-name">${escapeHtml(item.mountain)}</span>
      <span class="powder-region">${escapeHtml(item.region || '')}</span>
      <span class="powder-stats">
        <span class="powder-stat" title="Modeled snow next 48 hours">
          <strong>${formatSnow(item.snowNext48h)}</strong> next 48h
        </span>
        <span class="powder-stat muted" title="Modeled snow last 48 hours">
          ${formatSnow(item.snowLast48h)} last 48h
        </span>
      </span>
    `;
    btn.addEventListener('click', () => {
      window.location.href = mountainPageHref(item.mountain);
    });
    powderList.appendChild(btn);
  });

  powderBoard.hidden = false;
}

function fillForecast(forecastEl, metrics) {
  const daily = metrics?.daily;
  if (!daily?.time?.length) {
    forecastEl.innerHTML = '<div class="forecast-error">No forecast data</div>';
    return;
  }
  const start = metrics.todayIdx ?? PAST_DAYS;
  forecastEl.innerHTML = '';
  const heading = document.createElement('div');
  heading.className = 'forecast-heading';
  heading.textContent = '7-day forecast';
  forecastEl.appendChild(heading);

  const summary = document.createElement('div');
  summary.className = 'forecast-summary';
  summary.innerHTML = `
    <span title="Modeled snowfall next 48h">Next 48h: <strong>${formatSnow(metrics.snowNext48h)}</strong></span>
    <span title="Modeled snowfall last 48h">Last 48h: <strong>${formatSnow(metrics.snowLast48h)}</strong></span>
  `;
  forecastEl.appendChild(summary);

  const list = document.createElement('div');
  list.className = 'forecast-days';
  for (let i = start; i < daily.time.length; i++) {
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
      <span class="forecast-snow" title="Snowfall">${snow > 0 ? formatSnow(snow) : '—'}</span>
      <span class="forecast-condition">${escapeHtml(weatherLabel(code))}</span>
    `;
    list.appendChild(row);
  }
  forecastEl.appendChild(list);
}

function createCard(resort) {
  const card = document.createElement('article');
  card.className = 'card card-openable';
  card.dataset.id = resort.id;
  card.dataset.mountain = resort.mountain || resort.id;
  card.dataset.region = resort.region || '';

  const mountain = resort.mountain || resort.id;
  const pageHref = mountainPageHref(mountain);
  const camCount = camsOnMountain(mountain);
  const isFav = favorites.has(resort.id);
  const metrics = getMetrics(resort);
  const badge = snowBadge(metrics);

  const header = document.createElement('header');
  header.className = 'card-header';
  header.innerHTML = `
    <div class="card-title-row">
      <h2 class="card-title">
        <a class="card-title-link" href="${escapeHtml(pageHref)}">${escapeHtml(resort.name)}</a>
      </h2>
      <button type="button" class="btn-fav ${isFav ? 'is-fav' : ''}" aria-label="${isFav ? 'Remove from favorites' : 'Add to favorites'}" title="Favorite">★</button>
    </div>
    <div class="card-meta">
      ${resort.region ? `<span class="card-region">${escapeHtml(resort.region)}</span>` : ''}
      ${badge ? `<span class="snow-badge ${badge.className}">${escapeHtml(badge.label)}</span>` : ''}
      ${metrics ? `<span class="snow-chip" title="Modeled snow next 48 hours">${formatSnow(metrics.snowNext48h)} / 48h</span>` : ''}
      <a class="card-resort-link" href="${escapeHtml(pageHref)}">${camCount > 1 ? `All ${camCount} cams` : 'Resort page'} →</a>
    </div>
  `;
  card.appendChild(header);

  header.querySelector('.btn-fav')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(resort.id);
  });

  const openResortPage = (e) => {
    // Don't hijack fav / iframe interaction / real middle-clicks
    if (e?.target?.closest?.('.btn-fav, .card-feed.has-iframe, a')) return;
    window.location.assign(pageHref);
  };

  card.addEventListener('click', openResortPage);
  card.style.cursor = 'pointer';
  card.title = `Open ${mountain} resort cams`;

  const feed = document.createElement('div');
  feed.className = 'card-feed';

  if (resort.type === 'iframe') {
    const iframe = document.createElement('iframe');
    // src set by IntersectionObserver when near viewport
    iframe.title = resort.name;
    iframe.tabIndex = -1;
    iframe.setAttribute(
      'allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
    );
    iframe.allowFullscreen = true;

    feed.classList.add('has-iframe', 'is-loading');
    feed.dataset.iframeSrc = resort.url;
    const hint = document.createElement('div');
    hint.className = 'iframe-hint';
    hint.textContent = 'Click cam to interact · title opens resort';
    const loading = document.createElement('div');
    loading.className = 'placeholder feed-loading';
    loading.textContent = 'Cam loads when scrolled into view';
    feed.appendChild(iframe);
    feed.appendChild(loading);
    feed.appendChild(hint);
    feed.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.card-feed.is-interactive').forEach((el) => {
        if (el !== feed) el.classList.remove('is-interactive');
      });
      feed.classList.add('is-interactive');
    });
    card.appendChild(feed);
    observeIframeFeed(feed);
  } else {
    const img = document.createElement('img');
    img.alt = resort.name;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.dataset.originalUrl = resort.url;

    feed.classList.add('is-loading', 'is-clickable');
    feed.title = `Open ${mountain} cams`;

    const updated = document.createElement('div');
    updated.className = 'card-updated';
    updated.textContent = 'Loading…';

    img.onerror = () => {
      feed.classList.remove('is-loading');
      updated.textContent = 'Unavailable';
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder error';
      placeholder.textContent = 'Webcam unavailable';
      feed.appendChild(placeholder);
      img.remove();
    };

    img.onload = () => {
      img.classList.add('is-loaded');
      feed.classList.remove('is-loading');
      updated.textContent = `Updated ${formatTime(Date.now())}`;
    };

    img.src = getImageUrl(resort.url);
    feed.appendChild(img);
    card.appendChild(feed);
    card.appendChild(updated);
  }

  if (resort.latitude != null && resort.longitude != null) {
    const forecastEl = document.createElement('div');
    forecastEl.className = 'card-forecast';
    forecastEl.setAttribute('aria-label', '7-day weather forecast');
    if (metrics) {
      fillForecast(forecastEl, metrics);
    } else {
      forecastEl.innerHTML = '<div class="forecast-loading">Loading forecast…</div>';
    }
    card.appendChild(forecastEl);
  }

  return card;
}

function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  saveFavorites();
  applyFiltersAndSort();
}

function filteredSortedResorts() {
  const region = regionFilter?.value || 'all';
  const sort = sortSelect?.value || 'name';
  const onlyFav = !!favoritesOnly?.checked;

  let list = RESORTS.filter((r) => {
    if (region !== 'all' && r.region !== region) return false;
    if (onlyFav && !favorites.has(r.id)) return false;
    return true;
  });

  const scoreIncoming = (r) => getMetrics(r)?.snowNext48h ?? -1;
  const scoreRecent = (r) => getMetrics(r)?.snowLast48h ?? -1;

  list = [...list].sort((a, b) => {
    // Favorites float to top when not filtering favorites-only
    const af = favorites.has(a.id) ? 1 : 0;
    const bf = favorites.has(b.id) ? 1 : 0;
    if (!onlyFav && af !== bf) return bf - af;

    if (sort === 'incoming') return scoreIncoming(b) - scoreIncoming(a) || a.name.localeCompare(b.name);
    if (sort === 'recent') return scoreRecent(b) - scoreRecent(a) || a.name.localeCompare(b.name);
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'region') {
      return (a.region || '').localeCompare(b.region || '') || a.name.localeCompare(b.name);
    }
    return 0; // default order
  });

  return list;
}

function applyFiltersAndSort() {
  disconnectIframeObserver();
  const list = filteredSortedResorts();
  grid.innerHTML = '';
  cardEls.clear();

  if (!list.length) {
    grid.innerHTML =
      '<p class="grid-empty">No cams match these filters. Star a few favorites or pick another region.</p>';
  } else {
    list.forEach((resort) => {
      const card = createCard(resort);
      cardEls.set(resort.id, card);
      grid.appendChild(card);
    });
  }

  if (resultCount) {
    const n = list.length;
    resultCount.textContent = `${n} cam${n === 1 ? '' : 's'}`;
  }
}

/** Update badges + forecasts without remounting cams (avoids blackout on snow load). */
function updateCardsSnowInPlace() {
  for (const resort of RESORTS) {
    const card = cardEls.get(resort.id);
    if (!card) continue;

    const mountain = resort.mountain || resort.id;
    const pageHref = mountainPageHref(mountain);
    const camCount = camsOnMountain(mountain);
    const metrics = getMetrics(resort);
    const badge = snowBadge(metrics);
    const meta = card.querySelector('.card-meta');
    if (meta) {
      meta.innerHTML = `
        ${resort.region ? `<span class="card-region">${escapeHtml(resort.region)}</span>` : ''}
        ${badge ? `<span class="snow-badge ${badge.className}">${escapeHtml(badge.label)}</span>` : ''}
        ${metrics ? `<span class="snow-chip" title="Modeled snow next 48 hours">${formatSnow(metrics.snowNext48h)} / 48h</span>` : ''}
        <a class="card-resort-link" href="${escapeHtml(pageHref)}">${camCount > 1 ? `All ${camCount} cams` : 'Resort page'} →</a>
      `;
    }

    let forecastEl = card.querySelector('.card-forecast');
    if (resort.latitude != null && resort.longitude != null) {
      if (!forecastEl) {
        forecastEl = document.createElement('div');
        forecastEl.className = 'card-forecast';
        forecastEl.setAttribute('aria-label', '7-day weather forecast');
        card.appendChild(forecastEl);
      }
      if (metrics) fillForecast(forecastEl, metrics);
      else forecastEl.innerHTML = '<div class="forecast-loading">Loading forecast…</div>';
    }
  }
}

function populateRegionFilter() {
  if (!regionFilter) return;
  const regions = [...new Set(RESORTS.map((r) => r.region).filter(Boolean))].sort();
  const current = regionFilter.value || 'all';
  regionFilter.innerHTML = '<option value="all">All regions</option>';
  regions.forEach((region) => {
    const opt = document.createElement('option');
    opt.value = region;
    opt.textContent = region;
    regionFilter.appendChild(opt);
  });
  regionFilter.value = regions.includes(current) || current === 'all' ? current : 'all';
}

function refreshAllImages() {
  // Soft swap: keep current frame visible until the new snapshot loads
  grid.querySelectorAll('.card-feed img').forEach((img) => {
    if (!img.dataset.originalUrl) return;
    const nextUrl = getImageUrl(img.dataset.originalUrl);
    const pre = new Image();
    pre.decoding = 'async';
    pre.onload = () => {
      img.src = nextUrl;
      img.classList.add('is-loaded');
      const updated = img.closest('.card')?.querySelector('.card-updated');
      if (updated) updated.textContent = `Updated ${formatTime(Date.now())}`;
    };
    pre.src = nextUrl;
  });
}

function startRefreshInterval() {
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  refreshIntervalId = setInterval(refreshAllImages, refreshMs);
}

function bindControls() {
  refreshSelect?.addEventListener('change', () => {
    refreshMs = parseInt(refreshSelect.value, 10);
    startRefreshInterval();
    savePrefs();
  });

  refreshBtn?.addEventListener('click', () => {
    refreshAllImages();
  });

  regionFilter?.addEventListener('change', () => {
    savePrefs();
    applyFiltersAndSort();
  });

  sortSelect?.addEventListener('change', () => {
    savePrefs();
    applyFiltersAndSort();
  });

  favoritesOnly?.addEventListener('change', () => {
    savePrefs();
    applyFiltersAndSort();
  });

}

async function init() {
  populateRegionFilter();
  applyPrefs();
  bindControls();

  // Deactivate interactive iframe when clicking elsewhere (restore page scroll)
  document.addEventListener('click', (e) => {
    if (e.target.closest('.card-feed.has-iframe')) return;
    document.querySelectorAll('.card-feed.is-interactive').forEach((el) => {
      el.classList.remove('is-interactive');
    });
  });

  // First paint with cams (forecasts fill after snow load)
  applyFiltersAndSort();
  startRefreshInterval();

  if (powderList) {
    powderList.innerHTML = '<p class="powder-loading">Scanning mountains for snow…</p>';
  }

  try {
    await loadAllSnow();
  } catch (err) {
    console.warn(err);
  }

  renderPowderBoard();
  updateCardsSnowInPlace();
}

init();

// Obfuscated contact — assembled only on click (keeps plain email out of HTML)
const contactBtn = document.getElementById('contactEmail');
contactBtn?.addEventListener('click', () => {
  const user = ['mark', 'zhong'].join('.');
  const host = ['greenlake', 'co'].join('.');
  const addr = `${user}@${host}`;
  const subject = encodeURIComponent('WhoGotSnow');
  window.location.href = `mailto:${addr}?subject=${subject}`;
});

// Public visit counter (CountAPI.xyz is dead — using CounterAPI.dev)
const visitEl = document.getElementById('visitCount');
if (visitEl) {
  fetch('https://api.counterapi.dev/v1/ski-resorts-webcam/visits/up')
    .then((r) => r.json())
    .then((data) => {
      if (data.count != null) visitEl.textContent = Number(data.count).toLocaleString();
    })
    .catch(() => {
      visitEl.textContent = '—';
    });
}
