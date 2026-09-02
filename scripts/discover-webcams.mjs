/**
 * Discover public webcam feeds from official mountain websites.
 *
 * Usage:
 *   node scripts/discover-webcams.mjs
 *   node scripts/discover-webcams.mjs --limit=20
 *   node scripts/discover-webcams.mjs --retry-errors
 *
 * Writes data/webcam-discoveries.json (resumable).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allMountains } from '../catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'webcam-discoveries.json');

const LIMIT = Number((process.argv.find((a) => a.startsWith('--limit=')) || '').split('=')[1] || 0);
const ONLY = (process.argv.find((a) => a.startsWith('--slugs=')) || '')
  .split('=')[1]
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean) || [];
const RETRY_ERRORS = process.argv.includes('--retry-errors');
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 WhoGotSnowBot/1.0';

const CAM_PATHS = ['/webcam', '/webcams', '/cameras', '/cams', '/live-cams', '/conditions'];

const SKIP_SITE = /facebook\.com|instagram\.com|twitter\.com|x\.com|youtube\.com|youtu\.be|tiktok\.com|tripadvisor\.com/i;
const SKIP_ASSET = /\.(css|js|woff2?|ttf|eot|svg|ico|pdf|zip|mp4|mp3|xml)(\?|$)/i;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function abortTimeout(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&#0*38;/g, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, ' ');
}

function absoluteUrl(href, base) {
  try {
    const u = new URL(decodeEntities(href), base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

function hostKey(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function sameSite(url, site) {
  const a = hostKey(url);
  const b = hostKey(site);
  if (!a || !b) return false;
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

function looksLikeCamPath(url) {
  return /web-?cams?|live-?cams?|camera|\bcams\b|snapshot|roundshot|hdrelay|brownrice|ipcamlive/i.test(url);
}

function brownriceSnapshot(url) {
  const m = String(url).match(/(?:live\d*|player)\.brownrice\.com\/(?:embed|snapshot|view)\/([^/?#&]+)/i);
  if (!m) return null;
  return `https://player.brownrice.com/snapshot/${decodeURIComponent(m[1])}`;
}

function classify(url) {
  const raw = decodeEntities(url);
  const u = raw.toLowerCase();
  if (!raw.startsWith('http')) return null;
  if (SKIP_ASSET.test(u) || /\/js\/hdrelay|\.js(\?|$)/i.test(u)) return null;
  if (/logo|favicon|sprite|icon[-_.]|placeholder|og[-_]?image|banner[-_]/i.test(u)) return null;
  const rice = brownriceSnapshot(raw);
  if (rice) return { url: rice, type: 'image', provider: 'Brownrice', score: 95 };
  if (/img\.hdrelay\.com\/frames\//.test(u)) {
    return { url: raw.split('?')[0], type: 'image', provider: 'HDRelay', score: 94 };
  }
  if (/hdrelay\.com/.test(u) && /\.(jpe?g|png|webp)(\?|$)/.test(u)) {
    return { url: raw, type: 'image', provider: 'HDRelay', score: 93 };
  }
  if (/hdrelay\.com/.test(u) && !/manage\.hdrelay\.com/.test(u)) {
    return { url: raw, type: 'iframe', provider: 'HDRelay', score: 78 };
  }
  if (/backend\.roundshot\.com\/cams\//.test(u)) {
    return { url: raw.split('?')[0], type: 'image', provider: 'Roundshot', score: 90 };
  }
  if (/roundshot\.com/.test(u) && !/storage\d*\.roundshot\.com/.test(u)) {
    return { url: raw, type: 'iframe', provider: 'Roundshot', score: 86 };
  }
  if (/ipcamlive\.com/.test(u)) return { url: raw, type: 'iframe', provider: 'IPCamLive', score: 80 };
  if (/camstreamer\.com/.test(u)) return { url: raw, type: 'iframe', provider: 'Camstreamer', score: 78 };
  if (/skiutah\.com\/files\/blob\//.test(u)) return { url: raw, type: 'image', provider: 'Ski Utah', score: 92 };
  if (/youtube\.com\/embed\/[a-zA-Z0-9_-]{8,}|youtu\.be\/[a-zA-Z0-9_-]{8,}/.test(raw)) {
    return { url: raw, type: 'iframe', provider: 'YouTube', score: 58 };
  }
  if (/axis-cgi|mjpg\/video|mjpeg/i.test(u)) return { url: raw, type: 'image', provider: 'Axis', score: 84 };
  if (/\.(jpe?g|png|webp)(\?|$)/.test(u) && /web-?cam|camera|snapshot|still|livecam|\bcams?\b|-cams?[-_.\/]|\/cams?\//i.test(u)) {
    return { url: raw, type: 'image', provider: 'Resort', score: 76 };
  }
  return null;
}

function extractUrls(html, base) {
  const found = new Set();
  const attrRe = /(?:href|src|content|data-src|data-lazy-src|data-original|poster)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(html))) {
    const abs = absoluteUrl(m[1], base);
    if (abs) found.add(abs);
  }
  const rawRe = /https?:\/\/[^\s"'<>\\]+/gi;
  while ((m = rawRe.exec(html))) {
    const cleaned = m[0].replace(/[),.;]+$/, '');
    const abs = absoluteUrl(cleaned, base);
    if (abs) found.add(abs);
  }
  return [...found];
}

function extractLinks(html, base) {
  const links = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const abs = absoluteUrl(m[1], base);
    if (!abs) continue;
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    links.push({ url: abs, text, href: m[1] });
  }
  return links;
}

async function fetchOnce(url, { timeout = 12000, maxBytes = 1_800_000, method = 'GET' } = {}) {
  const res = await fetch(url, {
    method,
    redirect: 'follow',
    signal: abortTimeout(timeout),
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.8',
    },
  });
  const ctype = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const finalUrl = res.url || url;
  if (method === 'HEAD') {
    return { ok: res.ok, status: res.status, ctype, finalUrl, body: '' };
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  const sliced = buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf;
  const body = new TextDecoder('utf-8', { fatal: false }).decode(sliced);
  return { ok: res.ok, status: res.status, ctype, finalUrl, body, bytes: buf.byteLength, buf: sliced };
}

function isJpegOrPng(buf) {
  if (!buf || buf.length < 8) return false;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const webp = buf[0] === 0x52 && buf[8] === 0x57;
  const gif = buf[0] === 0x47 && buf[1] === 0x49;
  return jpeg || png || webp || gif;
}

async function verifyCandidate(candidate) {
  try {
    if (candidate.type === 'image') {
      const got = await fetchOnce(candidate.url, { timeout: 10000, maxBytes: 400_000 });
      if (!got.ok) return null;
      const imageType = got.ctype.startsWith('image/');
      if (!imageType && !isJpegOrPng(got.buf)) return null;
      if ((got.bytes || 0) < 8000 && candidate.provider === 'Resort') return null;
      return { ...candidate, verified: true, contentType: got.ctype || 'image/jpeg' };
    }
    if (candidate.provider === 'YouTube') {
      return { ...candidate, verified: true, contentType: 'text/html' };
    }
    const got = await fetchOnce(candidate.url, { timeout: 10000, maxBytes: 80_000 });
    if (!got.ok) return null;
    if (got.ctype.startsWith('text/html') || got.ctype.includes('javascript') || got.ctype === '') {
      return { ...candidate, verified: true, contentType: got.ctype || 'text/html' };
    }
    if (got.ctype.startsWith('image/')) {
      return { ...candidate, type: 'image', verified: true, contentType: got.ctype };
    }
    return null;
  } catch {
    return null;
  }
}

async function loadState() {
  try {
    const raw = JSON.parse(await readFile(OUT, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function saveState(rows) {
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(rows, null, 2)}\n`);
}

function pickPages(site, homepageHtml, homepageUrl) {
  const linked = [];
  const seen = new Set();
  const add = (url) => {
    const clean = String(url || '').split('#')[0];
    if (!clean || seen.has(clean) || SKIP_ASSET.test(clean)) return;
    if (!sameSite(clean, site)) return;
    seen.add(clean);
    linked.push(clean);
  };
  add(homepageUrl);
  for (const link of extractLinks(homepageHtml, homepageUrl)) {
    if (!looksLikeCamPath(`${link.href || ''} ${link.url} ${link.text}`)) continue;
    add(link.url);
  }
  if (linked.length < 2) {
    for (const p of CAM_PATHS) add(absoluteUrl(p, site));
  }
  return linked.slice(0, 8);
}

function candidatesFromHtml(html, pageUrl, site) {
  const out = [];
  const seen = new Set();
  const pageIsCam = looksLikeCamPath(pageUrl) || /web\s*cams?|live\s*cams?/i.test(html.slice(0, 25000));
  for (const url of extractUrls(html, pageUrl)) {
    const kind = classify(url);
    if (!kind) continue;
    if (kind.provider === 'YouTube' && !pageIsCam) continue;
    if (kind.type === 'image' && kind.provider === 'Resort' && !sameSite(kind.url, site) && !looksLikeCamPath(kind.url)) {
      continue;
    }
    const key = kind.url.split('?')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(kind);
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 12);
}

async function discoverMountain(mountain) {
  const site = mountain.website;
  const notes = [];
  let homepage;
  try {
    homepage = await fetchOnce(site, { timeout: 14000 });
  } catch (err) {
    return { status: 'error', notes: [`homepage fetch failed: ${err.name || err.message}`], cams: [] };
  }
  if (!homepage.ok || !/html/i.test(homepage.ctype || '')) {
    const blocked = homepage.status === 307 || homepage.status === 403 || /sucuri|cloudflare|captcha/i.test(homepage.body || '');
    return {
      status: blocked ? 'blocked' : 'error',
      notes: [`homepage HTTP ${homepage.status} ${homepage.ctype}`],
      cams: [],
    };
  }

  const pages = pickPages(site, homepage.body, homepage.finalUrl);
  const all = [];
  const seenPage = new Set();
  for (const page of pages) {
    if (seenPage.has(page)) continue;
    seenPage.add(page);
    await sleep(250);
    let html = '';
    let pageUrl = page;
    if (page === homepage.finalUrl || page === site) {
      html = homepage.body;
      pageUrl = homepage.finalUrl;
    } else {
      try {
        const got = await fetchOnce(page, { timeout: 12000 });
        if (!got.ok || !got.ctype.includes('html')) continue;
        html = got.body;
        pageUrl = got.finalUrl;
      } catch {
        continue;
      }
    }
    all.push(...candidatesFromHtml(html, pageUrl, site));
  }

  const uniq = [];
  const seenUrl = new Set();
  for (const row of all.sort((a, b) => b.score - a.score)) {
    const key = row.url.split('?')[0];
    if (seenUrl.has(key)) continue;
    seenUrl.add(key);
    uniq.push(row);
  }

  const verified = [];
  for (const cand of uniq.slice(0, 8)) {
    await sleep(150);
    const ok = await verifyCandidate(cand);
    if (ok) verified.push(ok);
    if (verified.length >= 3) break;
  }

  if (verified.length) {
    notes.push(`checked ${pages.length} pages, verified ${verified.length}`);
    return { status: 'found', notes, cams: verified };
  }
  notes.push(`checked ${pages.length} pages, no verified feed`);
  return { status: 'none', notes, cams: [] };
}

async function main() {
  const prior = await loadState();
  const bySlug = new Map(prior.map((row) => [row.slug, row]));
  const missing = allMountains().filter((m) => {
    if (m.cams.length || !m.website || SKIP_SITE.test(m.website)) return false;
    if (ONLY.length) return ONLY.includes(m.slug);
    const prev = bySlug.get(m.slug);
    if (!prev) return true;
    if (RETRY_ERRORS && (prev.status === 'error' || prev.status === 'blocked')) return true;
    return false;
  });
  const queue = LIMIT > 0 ? missing.slice(0, LIMIT) : missing;
  console.log(`Discover webcams: ${queue.length} to check (${prior.length} already stored, ${missing.length} remaining)`);

  let i = 0;
  for (const mountain of queue) {
    i += 1;
    const started = Date.now();
    process.stdout.write(`[${i}/${queue.length}] ${mountain.name} (${mountain.region}) … `);
    let result;
    try {
      result = await discoverMountain(mountain);
    } catch (err) {
      result = { status: 'error', notes: [String(err?.message || err)], cams: [] };
    }
    bySlug.set(mountain.slug, {
      slug: mountain.slug,
      name: mountain.name,
      region: mountain.region,
      website: mountain.website,
      latitude: mountain.latitude,
      longitude: mountain.longitude,
      ...result,
      checkedAt: new Date().toISOString(),
    });
    const ms = Date.now() - started;
    const extra = result.cams[0] ? result.cams[0].url.slice(0, 70) : result.notes[0] || '';
    console.log(`${result.status} ${ms}ms ${extra}`);
    await saveState([...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name)));
    await sleep(400);
  }

  const rows = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
  await saveState(rows);
  const found = rows.filter((r) => r.status === 'found').length;
  const none = rows.filter((r) => r.status === 'none').length;
  const error = rows.filter((r) => r.status === 'error').length;
  console.log(`Done. stored=${rows.length} found=${found} none=${none} error=${error} → ${path.relative(ROOT, OUT)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
