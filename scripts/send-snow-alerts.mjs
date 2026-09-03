/**
 * Hourly Sick Day alerts: Stripe paying customers × data/snow.json → Resend.
 *
 * Secrets (GitHub Actions):
 *   STRIPE_SECRET_KEY  — Stripe secret (sk_test_… or sk_live_…)
 *   RESEND_API_KEY     — Resend API key
 *   RESEND_FROM        — e.g. WhoGotSnow <alerts@whogotsnow.com>
 *
 * Local:
 *   STRIPE_SECRET_KEY=sk_test_… RESEND_API_KEY=re_… RESEND_FROM='…' \
 *     node scripts/send-snow-alerts.mjs --dry-run --force-season
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESORTS } from '../resorts.js';
import {
  mountainSlug,
  cmToIn,
  utcDay,
  isAlertSeason,
  decodeSickDayRef,
  parseSnowAlerts,
} from '../lib/sick-day.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SNOW_PATH = path.join(ROOT, 'data', 'snow.json');
const SITE = 'https://whogotsnow.com';

const dryRun = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
const forceSeason = process.env.FORCE_SEASON === '1' || process.argv.includes('--force-season');
const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const resendKey = process.env.RESEND_API_KEY || '';
const resendFrom = process.env.RESEND_FROM || 'WhoGotSnow <alerts@whogotsnow.com>';

function slugToMountain() {
  const map = new Map();
  for (const r of RESORTS) {
    const name = r.mountain || r.id;
    const slug = mountainSlug(name);
    if (slug && !map.has(slug)) map.set(slug, name);
  }
  return map;
}

async function readSnow() {
  const parsed = JSON.parse(await readFile(SNOW_PATH, 'utf8'));
  return new Map(parsed.entries || []);
}

async function stripeFetch(method, resourcePath, body) {
  const url = resourcePath.startsWith('http')
    ? resourcePath
    : `https://api.stripe.com/v1/${resourcePath}`;
  const headers = { Authorization: `Bearer ${stripeKey}` };
  const opts = { method, headers };
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    opts.body = new URLSearchParams(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe ${res.status} ${resourcePath}`);
  }
  return data;
}

async function listPaidSessions() {
  const sessions = [];
  let startingAfter = '';
  for (let i = 0; i < 10; i++) {
    const params = new URLSearchParams({ limit: '100', status: 'complete' });
    if (startingAfter) params.set('starting_after', startingAfter);
    const page = await stripeFetch('GET', `checkout/sessions?${params}`);
    const paid = (page.data || []).filter((s) => s.payment_status === 'paid');
    sessions.push(...paid);
    if (!page.has_more || !page.data?.length) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return sessions;
}

async function syncCustomer(session, names) {
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!customerId) return null;
  const prefs = decodeSickDayRef(session.client_reference_id);
  if (!prefs) return null;

  const customer = await stripeFetch('GET', `customers/${customerId}`);
  const existing = decodeSickDayRef(customer.metadata?.sick_day);
  const created = session.created || 0;
  const prevCreated = Number(customer.metadata?.sick_day_at || 0);
  const useSession = !existing || created >= prevCreated;

  if (useSession && (!existing || session.client_reference_id !== customer.metadata?.sick_day)) {
    await stripeFetch('POST', `customers/${customerId}`, {
      'metadata[sick_day]': session.client_reference_id,
      'metadata[sick_day_at]': String(created),
    });
  }

  const email = customer.email || session.customer_details?.email || session.customer_email;
  const decoded = useSession ? prefs : existing;
  const mountains = decoded.slugs
    .map((slug) => ({ slug, name: names.get(slug) }))
    .filter((m) => m.name);

  return {
    customerId,
    email,
    inches: decoded.inches,
    mountains,
    snowAlerts: parseSnowAlerts(customer.metadata?.snow_alerts),
  };
}

function formatInches(cm) {
  const inches = cmToIn(cm);
  if (inches < 0.5) return '<0.5″';
  return `${inches.toFixed(inches >= 10 ? 0 : 1)}″`;
}

function emailBodies(hits, inchesStick) {
  const lines = hits.map(
    (h) =>
      `${h.name}: ${formatInches(h.cm)} next 72h — ${SITE}/mountains/${h.slug}.html`
  );
  const subject =
    hits.length === 1
      ? `Sick day: ${hits[0].name} ${formatInches(hits[0].cm)}`
      : `Sick day: ${hits.map((h) => h.name).join(', ')}`;
  const text = [
    'WhoGotSnow — pick your sick day.',
    '',
    `The model is at/above your ${inchesStick}″ stick:`,
    ...lines.map((l) => `• ${l}`),
    '',
    'Open-Meteo estimate, not an official resort report.',
  ].join('\n');
  const html = `
    <p style="font-family:Georgia,serif;font-size:1.35rem;margin:0 0 0.75rem">WhoGotSnow</p>
    <p>The model is at/above your ${inchesStick}″ stick:</p>
    <ul>
      ${hits
        .map(
          (h) =>
            `<li><a href="${SITE}/mountains/${h.slug}.html">${h.name}</a> — ${formatInches(h.cm)} next 72h</li>`
        )
        .join('')}
    </ul>
    <p style="color:#666;font-size:0.9rem">Open-Meteo estimate, not an official resort report.</p>
  `;
  return { subject, text, html };
}

async function sendEmail(to, hits, inchesStick) {
  const { subject, text, html } = emailBodies(hits, inchesStick);
  if (dryRun) {
    console.log(`[dry-run] ${to} :: ${subject}`);
    return true;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [to],
      subject,
      text,
      html,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Resend ${res.status}`);
  }
  return true;
}

async function markSent(customerId, snowAlerts) {
  if (dryRun) return;
  await stripeFetch('POST', `customers/${customerId}`, {
    'metadata[snow_alerts]': JSON.stringify(snowAlerts),
  });
}

if (!stripeKey) {
  console.log('No STRIPE_SECRET_KEY — skip alerts (add the GitHub secret to go live).');
  process.exit(0);
}

if (!forceSeason && !isAlertSeason()) {
  console.log('Off-season (May–September UTC) — skip alerts. Pass --force-season to override.');
  process.exit(0);
}

if (!dryRun && !resendKey) {
  console.log('No RESEND_API_KEY — skip send. Use --dry-run to inspect without Resend.');
  process.exit(0);
}

const names = slugToMountain();
const snow = await readSnow();
const today = utcDay();
const sessions = await listPaidSessions();
const latestByCustomer = new Map();
for (const session of sessions) {
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!customerId || !decodeSickDayRef(session.client_reference_id)) continue;
  const prev = latestByCustomer.get(customerId);
  if (!prev || (session.created || 0) >= (prev.created || 0)) {
    latestByCustomer.set(customerId, session);
  }
}

const customers = new Map();
for (const session of latestByCustomer.values()) {
  try {
    const row = await syncCustomer(session, names);
    if (row?.email) customers.set(row.customerId, row);
  } catch (err) {
    console.warn('session skip', session.id, err.message);
  }
}

let sent = 0;
let skipped = 0;

for (const row of customers.values()) {
  const hits = [];
  for (const mountain of row.mountains) {
    const metrics = snow.get(mountain.name);
    const cm = Number(metrics?.snowNext72h ?? metrics?.snowNext48h ?? 0);
    const inches = cmToIn(cm);
    if (inches < row.inches) continue;
    if (row.snowAlerts[mountain.slug] === today) continue;
    hits.push({ ...mountain, cm, inches });
  }
  if (!hits.length) {
    skipped += 1;
    continue;
  }
  try {
    await sendEmail(row.email, hits, row.inches);
    for (const h of hits) row.snowAlerts[h.slug] = today;
    await markSent(row.customerId, row.snowAlerts);
    sent += 1;
    console.log('sent', row.email, hits.map((h) => h.slug).join(','));
  } catch (err) {
    console.warn('send fail', row.email, err.message);
  }
}

console.log(
  `Sick day alerts: ${sent} sent, ${skipped} quiet, ${customers.size} paying (${dryRun ? 'dry-run' : 'live'})`
);
