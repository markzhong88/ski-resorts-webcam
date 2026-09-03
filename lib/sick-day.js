/** Shared Sick Day helpers (browser + Node). */

export function mountainSlug(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function cmToIn(cm) {
  return Number(cm || 0) / 2.54;
}

export function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Oct–Apr in UTC. Summer is off-season for alerts. */
export function isAlertSeason(date = new Date()) {
  const month = date.getUTCMonth();
  return month >= 9 || month <= 3;
}

export function encodeSickDayRef({ inches, slugs, maxMountains = 5 }) {
  const unique = [...new Set(slugs.map((s) => String(s).trim()).filter(Boolean))].slice(
    0,
    maxMountains
  );
  const n = Number(inches);
  if (!Number.isFinite(n) || n <= 0 || unique.length === 0) return '';
  return `v1:${n}:${unique.join(',')}`;
}

const STORAGE_KEY = 'sickDayPrefs';

export function savePrefsLocal({ email, inches, slugs }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, inches, slugs, savedAt: Date.now() }));
  } catch { /* private browsing */ }
}

export function loadPrefsLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      email: parsed.email || '',
      inches: Number(parsed.inches) || 4,
      slugs: Array.isArray(parsed.slugs) ? parsed.slugs.filter(Boolean) : [],
    };
  } catch {
    return null;
  }
}

export function clearPrefsLocal() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ok */ }
}

export function decodeSickDayRef(ref) {
  if (!ref || typeof ref !== 'string') return null;
  const [version, inchesRaw, slugPart] = ref.split(':');
  if (version !== 'v1' || !slugPart) return null;
  const inches = Number(inchesRaw);
  const slugs = slugPart
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!Number.isFinite(inches) || inches <= 0 || slugs.length === 0) return null;
  return { inches, slugs };
}

export function checkoutUrl({ paymentLink, email, ref }) {
  const url = new URL(paymentLink);
  if (email) url.searchParams.set('prefilled_email', email.trim());
  url.searchParams.set('client_reference_id', ref);
  return url.toString();
}

export function parseSnowAlerts(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
