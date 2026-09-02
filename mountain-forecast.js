/**
 * 7-day forecast for mountain detail pages (Open-Meteo).
 * Expects #mountainForecast[data-lat][data-lon][data-name] on the page.
 */
(() => {
  const el = document.getElementById('mountainForecast');
  if (!el) return;

  const lat = el.dataset.lat;
  const lon = el.dataset.lon;
  const name = el.dataset.name || 'Mountain';
  if (lat == null || lon == null || lat === '' || lon === '') {
    el.innerHTML = '<p class="forecast-error">No coordinates for this mountain.</p>';
    return;
  }

  const PAST_DAYS = 2;
  const FORECAST_DAYS = 7;
  const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

  const weatherLabel = (code) => {
    const map = {
      0: 'Clear',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Rime fog',
      51: 'Drizzle',
      53: 'Drizzle',
      55: 'Drizzle',
      56: 'Freezing drizzle',
      57: 'Freezing drizzle',
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
  };

  const escapeHtml = (s) => {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  };

  const formatSnow = (cm) => {
    if (cm == null || cm <= 0) return '0″';
    const inches = cm / 2.54;
    if (inches < 0.5) return '<0.5″';
    return `${inches.toFixed(inches >= 10 ? 0 : 1)}″`;
  };

  const formatForecastDate = (isoDate) => {
    const d = new Date(`${isoDate}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) return 'Today';
    if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return d.toLocaleDateString([], { weekday: 'short' });
  };

  const parseMetrics = (daily) => {
    if (!daily?.time?.length) return null;
    const todayIdx = Math.min(PAST_DAYS, daily.time.length - 1);
    const snow = (i) => Number(daily.snowfall_sum?.[i] ?? 0);
    let snowLast48h = 0;
    for (let i = 0; i < todayIdx; i++) snowLast48h += snow(i);
    let snowNext48h = 0;
    for (let i = todayIdx; i < Math.min(todayIdx + 2, daily.time.length); i++) {
      snowNext48h += snow(i);
    }
    return { daily, todayIdx, snowLast48h, snowNext48h };
  };

  const render = (metrics) => {
    const { daily, todayIdx, snowNext48h, snowLast48h } = metrics;
    const heading = document.createElement('div');
    heading.className = 'forecast-heading';
    heading.textContent = `7-day forecast · ${name}`;

    const summary = document.createElement('div');
    summary.className = 'forecast-summary';
    summary.innerHTML = `
      <span title="Modeled snowfall next 48h">Next 48h: <strong>${formatSnow(snowNext48h)}</strong></span>
      <span title="Modeled snowfall last 48h">Last 48h: <strong>${formatSnow(snowLast48h)}</strong></span>
    `;

    const list = document.createElement('div');
    list.className = 'forecast-days';
    for (let i = todayIdx; i < daily.time.length; i++) {
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

    const note = document.createElement('p');
    note.className = 'mountain-forecast-note';
    note.innerHTML =
      'Modeled via <a href="https://open-meteo.com/" rel="noopener noreferrer" target="_blank">Open-Meteo</a> — not an official resort report.';

    el.replaceChildren(heading, summary, list, note);
  };

  el.innerHTML = '<p class="forecast-loading">Loading forecast…</p>';

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: 'temperature_2m_max,temperature_2m_min,snowfall_sum,precipitation_sum,weather_code',
    temperature_unit: 'fahrenheit',
    timezone: 'auto',
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
  });

  const abortTimeout = (ms) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
    return controller.signal;
  };

  const loadForecast = async () => {
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${OPEN_METEO}?${params}`, {
          signal: abortTimeout(8000),
        });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(text.trim().slice(0, 160) || `HTTP ${res.status}`);
        }
        if (!res.ok || data?.error) {
          throw new Error(data?.reason || res.statusText || `HTTP ${res.status}`);
        }
        const metrics = parseMetrics(data.daily);
        if (!metrics) throw new Error('No daily data');
        return metrics;
      } catch (err) {
        lastErr = err;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
    throw lastErr;
  };

  loadForecast()
    .then(render)
    .catch(() => {
      el.innerHTML =
        '<p class="forecast-error">Forecast unavailable right now. Cams below still work.</p>';
    });
})();
