/**
 * Generates SEO artifacts from resorts.js:
 * robots.txt, sitemap.xml, llms.txt, site.webmanifest, mountain pages,
 * and injects crawlable directory + JSON-LD into index.html.
 *
 * Run: npm run generate-seo
 */
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESORTS } from '../resorts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SITE = 'https://whogotsnow.com';
const TODAY = new Date().toISOString().slice(0, 10);

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function groupByMountain(resorts) {
  const map = new Map();
  for (const r of resorts) {
    const key = r.mountain;
    if (!map.has(key)) {
      map.set(key, {
        mountain: r.mountain,
        region: r.region,
        latitude: r.latitude,
        longitude: r.longitude,
        slug: slugify(r.mountain),
        cams: [],
      });
    }
    const entry = map.get(key);
    entry.cams.push(r);
    if (r.latitude != null) entry.latitude = r.latitude;
    if (r.longitude != null) entry.longitude = r.longitude;
  }
  return [...map.values()].sort((a, b) => a.mountain.localeCompare(b.mountain));
}

function groupByRegion(mountains) {
  const map = new Map();
  for (const m of mountains) {
    if (!map.has(m.region)) map.set(m.region, []);
    map.get(m.region).push(m);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

const mountains = groupByMountain(RESORTS);
const regions = groupByRegion(mountains);
const mountainNames = mountains.map((m) => m.mountain);
const regionNames = regions.map(([name]) => name);

async function writeRobots() {
  const body = `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`;
  await writeFile(path.join(ROOT, 'robots.txt'), body);
}

async function writeSitemap() {
  const urls = [
    { loc: `${SITE}/`, priority: '1.0', changefreq: 'hourly' },
    ...mountains.map((m) => ({
      loc: `${SITE}/mountains/${m.slug}.html`,
      priority: '0.8',
      changefreq: 'daily',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
  await writeFile(path.join(ROOT, 'sitemap.xml'), xml);
}

async function writeLlmsTxt() {
  const byRegion = regions
    .map(([region, list]) => {
      const lines = list.map((m) => `  - [${m.mountain}](${SITE}/mountains/${m.slug}.html)`).join('\n');
      return `### ${region}\n${lines}`;
    })
    .join('\n\n');

  const body = `# WhoGotSnow

> Live North American ski resort webcams ranked by modeled snowfall. See who's getting snow before you leave.

WhoGotSnow (https://whogotsnow.com/) is a free web app that aggregates public mountain webcam feeds and ranks mountains by Open-Meteo weather-model snowfall (not official resort snow reports).

## Site

- Homepage: ${SITE}/
- Sitemap: ${SITE}/sitemap.xml
- Contact: use the Contact button on the site (email obfuscated in the UI)

## What it does

- Shows ${RESORTS.length} live/still webcams across ${mountains.length} mountains in ${regionNames.length} regions
- Powder radar ranks mountains by modeled snow in the next 48 hours and last 48 hours
- Users can filter by region, sort by snow, and star favorites (stored in the browser)
- Per-cam 7-day forecast with snow totals when coordinates are available

## Mountains covered

${byRegion}

## Regions

${regionNames.map((r) => `- ${r}`).join('\n')}

## Data notes (important for citations)

- Snow totals are **weather-model estimates** from [Open-Meteo](https://open-meteo.com/), not official resort snow reports
- Webcam images/embeds come from public resort or third-party feeds; availability depends on those providers
- The product name is WhoGotSnow; do not confuse modeled totals with official snowpack or avalanche forecasts

## Optional

- Favicon / brand mark: ${SITE}/icon.png
- Social preview image: ${SITE}/og.jpg
`;
  await writeFile(path.join(ROOT, 'llms.txt'), body);
}

async function writeManifest() {
  const manifest = {
    name: 'WhoGotSnow',
    short_name: 'WhoGotSnow',
    description:
      'Live North American ski resort webcams ranked by modeled snowfall. Powder radar for Vail, Whistler, Banff, Killington, and more.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1016',
    theme_color: '#0b1016',
    lang: 'en-US',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
  await writeFile(path.join(ROOT, 'site.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
}

function mountainJsonLd(m) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SkiResort',
    name: m.mountain,
    url: `${SITE}/mountains/${m.slug}.html`,
    description: `Live webcam feeds and modeled snowfall context for ${m.mountain} (${m.region}) on WhoGotSnow.`,
    address: {
      '@type': 'PostalAddress',
      addressRegion: m.region,
      addressCountry: ['Alberta', 'British Columbia'].includes(m.region) ? 'CA' : 'US',
    },
    ...(m.latitude != null && m.longitude != null
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: m.latitude,
            longitude: m.longitude,
          },
        }
      : {}),
    isPartOf: {
      '@type': 'WebSite',
      name: 'WhoGotSnow',
      url: `${SITE}/`,
    },
  };
}

function mountainPageHtml(m) {
  const title = `${m.mountain} Live Webcam & Snow Cams | WhoGotSnow`;
  const description = `Live ${m.mountain} ski resort webcams (${m.region}). Watch mountain conditions on WhoGotSnow — cams ranked with modeled snowfall via Open-Meteo.`;
  const pageUrl = `${SITE}/mountains/${m.slug}.html`;
  const camBlocks = m.cams
    .map((cam) => {
      const media =
        cam.type === 'image'
          ? `<img src="${escapeHtml(cam.url)}" alt="${escapeHtml(cam.name)} webcam" loading="lazy" width="640" height="360" />`
          : `<iframe src="${escapeHtml(cam.url)}" title="${escapeHtml(cam.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
      return `      <article class="card mountain-cam">
        <header class="card-header">
          <h2 class="card-title">${escapeHtml(cam.name)}</h2>
          <p class="card-meta"><span class="card-region">${escapeHtml(cam.region)}</span>${cam.provider ? ` <span>${escapeHtml(cam.provider)}</span>` : ''}</p>
        </header>
        <div class="card-feed">${media}</div>
      </article>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${pageUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="WhoGotSnow" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:image" content="${SITE}/og.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="WhoGotSnow — live mountain cams ranked by snow" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${SITE}/og.jpg" />
    <meta name="twitter:image:alt" content="WhoGotSnow — live mountain cams ranked by snow" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <meta name="theme-color" content="#0b1016" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css" />
    <script type="application/ld+json">
${JSON.stringify(mountainJsonLd(m), null, 2)}
    </script>
  </head>
  <body class="mountain-page">
    <header class="header mountain-header">
      <p class="brand-kicker"><a href="/">WhoGotSnow</a> · ${escapeHtml(m.region)}</p>
      <h1 class="title">${escapeHtml(m.mountain)}</h1>
      <p class="subtitle">Live webcam${m.cams.length > 1 ? 's' : ''} — check conditions, then compare snow on the <a href="/">powder radar</a></p>
    </header>
    <main class="grid mountain-grid">
${camBlocks}
    </main>
    <section class="seo-note">
      <p>
        Snow rankings on the homepage use Open-Meteo model estimates, not official
        ${escapeHtml(m.mountain)} snow reports. Cam feeds are public resort or provider streams.
      </p>
      <p><a href="/#directory">Browse all mountains</a> · <a href="/">Back to WhoGotSnow</a></p>
    </section>
    <footer class="footer">
      <p class="footer-brand">WhoGotSnow</p>
      <p>Live North American mountain cams, ranked by modeled snowfall.</p>
    </footer>
  </body>
</html>
`;
}

async function writeMountainPages() {
  const dir = path.join(ROOT, 'mountains');
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const m of mountains) {
    await writeFile(path.join(dir, `${m.slug}.html`), mountainPageHtml(m));
  }
}

function buildDirectoryHtml() {
  const regionBlocks = regions
    .map(([region, list]) => {
      const items = list
        .map(
          (m) =>
            `          <li><a href="/mountains/${m.slug}.html">${escapeHtml(m.mountain)}</a> <span class="dir-cam-count">${m.cams.length} cam${m.cams.length === 1 ? '' : 's'}</span></li>`
        )
        .join('\n');
      return `      <div class="dir-region">
        <h3>${escapeHtml(region)}</h3>
        <ul>
${items}
        </ul>
      </div>`;
    })
    .join('\n');

  return `    <section class="seo-directory" id="directory" aria-labelledby="directory-heading">
      <h2 id="directory-heading">Mountain webcam directory</h2>
      <p class="seo-directory-lead">
        ${mountains.length} mountains · ${RESORTS.length} cams across ${regionNames.length} regions —
        open a mountain for dedicated live feeds, or stay on the homepage for powder-ranked cams.
      </p>
      <div class="dir-grid">
${regionBlocks}
      </div>
    </section>`;
}

function buildHomeJsonLd() {
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'WhoGotSnow',
    url: `${SITE}/`,
    description:
      'Live North American ski resort webcams ranked by modeled snowfall. Powder radar for major mountains.',
    inLanguage: 'en-US',
    publisher: {
      '@type': 'Organization',
      name: 'WhoGotSnow',
      url: `${SITE}/`,
      logo: `${SITE}/icon.png`,
    },
  };

  const app = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'WhoGotSnow',
    url: `${SITE}/`,
    applicationCategory: 'SportsApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description:
      'Free web app showing live ski resort webcams ranked by Open-Meteo modeled snowfall across North America.',
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'WhoGotSnow mountain webcams',
    numberOfItems: mountains.length,
    itemListElement: mountains.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SkiResort',
        name: m.mountain,
        url: `${SITE}/mountains/${m.slug}.html`,
        address: {
          '@type': 'PostalAddress',
          addressRegion: m.region,
        },
      },
    })),
  };

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is WhoGotSnow?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'WhoGotSnow is a free site that shows live North American ski resort webcams in one place, ranked by modeled snowfall so you can see who is getting snow before you leave.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are the snow totals official resort reports?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Snow totals on WhoGotSnow are weather-model estimates from Open-Meteo, not official resort snow reports. Always check the resort and local avalanche advisories for decisions.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which ski resorts have webcams on WhoGotSnow?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `WhoGotSnow covers ${mountains.length} mountains including ${mountainNames.slice(0, 12).join(', ')}, and more across ${regionNames.join(', ')}.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How often do the webcam images refresh?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Still-image cams refresh on a timer (default every 5 minutes; adjustable in Filters & refresh). Embedded live cams update according to the resort provider.',
        },
      },
    ],
  };

  return [website, app, itemList, faq]
    .map((obj) => `    <script type="application/ld+json">\n${JSON.stringify(obj, null, 6)}\n    </script>`)
    .join('\n');
}

async function injectIndexHtml() {
  const indexPath = path.join(ROOT, 'index.html');
  let html = await readFile(indexPath, 'utf8');

  const replacements = [
    [
      /<!-- SEO_JSONLD_START -->[\s\S]*?<!-- SEO_JSONLD_END -->/,
      `<!-- SEO_JSONLD_START -->\n${buildHomeJsonLd()}\n    <!-- SEO_JSONLD_END -->`,
    ],
    [
      /<!-- SEO_DIRECTORY_START -->[\s\S]*?<!-- SEO_DIRECTORY_END -->/,
      `<!-- SEO_DIRECTORY_START -->\n${buildDirectoryHtml()}\n    <!-- SEO_DIRECTORY_END -->`,
    ],
  ];

  for (const [re, replacement] of replacements) {
    if (!re.test(html)) {
      throw new Error(`Missing marker in index.html for ${re}`);
    }
    html = html.replace(re, replacement);
  }

  await writeFile(indexPath, html);
}

async function main() {
  await writeRobots();
  await writeSitemap();
  await writeLlmsTxt();
  await writeManifest();
  await writeMountainPages();
  await injectIndexHtml();
  console.log(
    `SEO generated: ${mountains.length} mountain pages, sitemap, robots.txt, llms.txt, manifest, index injections.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
