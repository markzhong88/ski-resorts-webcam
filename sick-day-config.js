/**
 * Sick Day waitlist (public, safe to commit).
 *
 * Do not put a SendGrid/Resend/Stripe secret here. The browser would leak it.
 *
 * Free ways to store emails (pick one):
 *
 * 1. Web3Forms (easiest, free 250/month)
 *    https://web3forms.com → Access Key → paste into waitlistAccessKey.
 *    Submissions email you; export CSV before November.
 *
 * 2. SendGrid you already pay for
 *    a) Marketing Campaigns → Signup Forms → embed or hosted page (no extra product).
 *    b) Cloudflare Worker (free) that POSTs to SendGrid Contacts with the secret
 *       stored in the Worker. Then paste the Worker URL into waitlistEndpoint.
 *
 * 3. Google Sheet (free, unlimited)
 *    Apps Script doPost → append row. Deploy as web app. Paste the URL
 *    into waitlistEndpoint. CORS is fiddly; form POST still works.
 *
 * Stripe checkout stays in this file for when you flip the page live in Nov.
 */
export const SICK_DAY_CONFIG = {
  priceUsd: 19,
  seasonLabel: '2026–27 ski season',
  maxMountains: 5,
  thresholdsIn: [3, 4, 6, 8],
  defaultThresholdIn: 4,
  stripePaymentLink: '',
  /** Web3Forms public access key (safe in the browser; lock it to whogotsnow.com in their dashboard). */
  waitlistAccessKey: 'd8972be6-7629-4c1e-bf1e-19d9c00ad4dd',
  /** Optional POST URL (Cloudflare Worker, Apps Script, Getform). */
  waitlistEndpoint: '',
};
