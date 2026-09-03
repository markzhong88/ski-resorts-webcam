/**
 * Sick Day waitlist — email only (supports more than one form on the page).
 */
import { SICK_DAY_CONFIG } from './sick-day-config.js';
import { savePrefsLocal, loadPrefsLocal } from './lib/sick-day.js';

const WEB3FORMS = 'https://api.web3forms.com/submit';
const joinedEl = document.getElementById('joinedBanner');

function waitlistKey() {
  return String(SICK_DAY_CONFIG.waitlistAccessKey || '').trim();
}

function waitlistUrl() {
  return String(SICK_DAY_CONFIG.waitlistEndpoint || '').trim();
}

function setButtons(text, disabled) {
  document.querySelectorAll('.wait-form .btn-sick').forEach((btn) => {
    btn.textContent = text;
    btn.disabled = disabled;
  });
}

function showJoined() {
  if (joinedEl) joinedEl.hidden = false;
  setButtons('You’re on the list', true);
  joinedEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function sendWaitlist(email) {
  const body = {
    email,
    name: 'Sick Day waitlist',
    message: `${email} joined the WhoGotSnow Sick Day waitlist`,
    source: 'whogotsnow-sick-day',
    subject: 'WhoGotSnow Sick Day waitlist',
  };
  const key = waitlistKey();
  const url = waitlistUrl();

  if (key) {
    const res = await fetch(WEB3FORMS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ access_key: key, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      throw new Error(data.message || 'Waitlist service rejected the signup.');
    }
    return;
  }

  if (url) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Waitlist endpoint ${res.status}`);
  }
}

async function onSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const emailEl = form.querySelector('input[type="email"]');
  const errorEl = form.querySelector('.form-error');
  const honeyEl = form.querySelector('.honeypot input');
  if (errorEl) errorEl.hidden = true;
  if (honeyEl?.value) return;

  const email = emailEl.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (errorEl) {
      errorEl.textContent = 'Enter an email we can reach in November.';
      errorEl.hidden = false;
    }
    emailEl.focus();
    return;
  }

  savePrefsLocal({ email, inches: 4, slugs: [] });
  document.querySelectorAll('.wait-form input[type="email"]').forEach((input) => {
    input.value = email;
  });

  if (!waitlistKey() && !waitlistUrl()) {
    showJoined();
    return;
  }

  setButtons('Joining…', true);
  try {
    await sendWaitlist(email);
    showJoined();
  } catch (err) {
    setButtons('Join the waitlist', false);
    if (errorEl) {
      errorEl.textContent = err.message || 'Could not join. Try again.';
      errorEl.hidden = false;
    }
  }
}

document.querySelectorAll('.wait-form').forEach((form) => {
  form.addEventListener('submit', onSubmit);
});

const saved = loadPrefsLocal();
if (saved?.email) {
  document.querySelectorAll('.wait-form input[type="email"]').forEach((input) => {
    input.value = saved.email;
  });
}
if (new URLSearchParams(location.search).get('joined') === '1') showJoined();
