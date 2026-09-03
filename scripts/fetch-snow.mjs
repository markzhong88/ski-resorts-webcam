/**
 * Snapshot Open-Meteo snow metrics for every mountain into data/snow.json.
 * One location per request — multi-location streams currently time out.
 *
 * Run: npm run refresh-snow
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESORTS } from '../resorts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'snow.json');
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const PAST_DAYS = 2;
const FORECAST_DAYS = 7;
const TIMEOUT_MS = 10000;
const RETRIES = 3;
const GAP_MS = 350;

function uniqueLocations() {
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

function parseSnowMetrics(daily) {
  if (!daily?.time?.length) return null;
  const todayIdx = Math.min(PAST_DAYS, daily.time.length - 1);
  const snow = (i) => Number(daily.snowfall_sum?.[i] ?? 0);
  let snowLast48h = 0;
  for (let i = 0; i < todayIdx; i++) snowLast48h += snow(i);
  let snowNext48h = 0;
  for (let i = todayIdx; i < Math.min(todayIdx + 2, daily.time.length); i++) {
    snowNext48h += snow(i);
  }
  let snowNext7d = 0;
  for (let i = todayIdx; i < daily.time.length; i++) snowNext7d += snow(i);
  return { daily, todayIdx, snowLast48h, snowNext48h, snowNext7d };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOne(loc) {
  const params = new URLSearchParams({
    latitude: String(loc.latitude),
    longitude: String(loc.longitude),
    daily: 'temperature_2m_max,temperature_2m_min,snowfall_sum,precipitation_sum,weather_code',
    temperature_unit: 'fahrenheit',
    timezone: 'auto',
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${OPEN_METEO}?${params}`, { signal: controller.signal });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text.trim().slice(0, 160) || `HTTP ${res.status}`);
    }
    if (!res.ok || data?.error) {
      throw new Error(data?.reason || data?.message || `HTTP ${res.status}`);
    }
    const metrics = parseSnowMetrics(data.daily);
    if (!metrics) throw new Error('No daily data');
    return { ...metrics, region: loc.region, sampleId: loc.sampleId };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOneRetry(loc) {
  let lastErr;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      return await fetchOne(loc);
    } catch (err) {
      lastErr = err;
      if (attempt < RETRIES) {
        const busy = /overload|concurrent|429|rate|timeout|abort/i.test(
          String(err?.message || err?.name || '')
        );
        await sleep((busy ? 2000 : 400) * (attempt + 1));
      }
    }
  }
  console.warn('miss', loc.mountain, lastErr?.message || lastErr);
  return null;
}

async function readExisting() {
  try {
    const parsed = JSON.parse(await readFile(OUT, 'utf8'));
    if (!Array.isArray(parsed?.entries)) return new Map();
    return new Map(parsed.entries);
  } catch {
    return new Map();
  }
}

const locations = uniqueLocations();
const entries = await readExisting();
let ok = 0;

for (const loc of locations) {
  const metrics = await fetchOneRetry(loc);
  if (metrics) {
    entries.set(loc.mountain, metrics);
    ok += 1;
  }
  await sleep(GAP_MS);
}

if (ok === 0 && entries.size === 0) {
  console.error('No forecasts fetched; leaving snapshot unchanged.');
  process.exit(1);
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  `${JSON.stringify(
    { savedAt: Date.now(), entries: [...entries.entries()] },
    null,
    2
  )}\n`
);
console.log(`Wrote ${OUT} (${ok}/${locations.length} fresh, ${entries.size} total)`);
