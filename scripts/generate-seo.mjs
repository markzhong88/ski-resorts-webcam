/**
 * Generates SEO artifacts from resorts.js:
 * robots.txt, sitemap.xml, llms.txt, site.webmanifest, mountain pages,
 * directory.html, faq.html, and injects JSON-LD into index.html.
 *
 * Run: npm run generate-seo
 */
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allMountains, catalogStats, slugifyMountain } from '../catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SITE = 'https://whogotsnow.com';
const TODAY = new Date().toISOString().slice(0, 10);
const GA_LOADER = `    <script src="/analytics.js" defer></script>`;
const FONT_LINK = `    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Source+Sans+3:ital,wght@0,400;0,500;0,600;0,700&display=swap" rel="stylesheet" />`;
const SITE_NAV = `    <div class="masthead">
      <a class="wordmark" href="/"><em>Who</em>GotSnow</a>
      <nav class="masthead-nav" aria-label="Site">
        <a href="/directory.html">Directory</a>
        <a href="/faq.html">FAQ</a>
      </nav>
    </div>`;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function groupByRegion(mountains) {
  const map = new Map();
  for (const m of mountains) {
    if (!map.has(m.region)) map.set(m.region, []);
    map.get(m.region).push(m);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

const mountains = allMountains().map((m) => ({ ...m, mountain: m.name }));
const regions = groupByRegion(mountains);
const mountainNames = mountains.map((m) => m.mountain);
const regionNames = regions.map(([name]) => name);
const stats = catalogStats();

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
    { loc: `${SITE}/directory.html`, priority: '0.9', changefreq: 'daily' },
    { loc: `${SITE}/faq.html`, priority: '0.6', changefreq: 'monthly' },
    ...regions.map(([region]) => ({
      loc: `${SITE}/regions/${slugifyMountain(region)}.html`,
      priority: '0.7',
      changefreq: 'weekly',
    })),
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
- Mountain directory: ${SITE}/directory.html
- Region hubs: ${regions.map(([region]) => `[${region}](${SITE}/regions/${slugifyMountain(region)}.html)`).join(', ')}
- FAQ: ${SITE}/faq.html
- Sitemap: ${SITE}/sitemap.xml
- Contact: use the Contact button on the homepage (email obfuscated in the UI)

## What it does

- Catalogs ${stats.mountains} mountains (${stats.withCams} with live cams, ${stats.cams} feeds) across ${stats.regionCount} regions
- Homepage shows starred mountains; powder radar ranks modeled snow among live cams plus saved hills

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
    background_color: '#101214',
    theme_color: '#101214',
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
      addressCountry: m.country === 'CA' ? 'CA' : 'US',
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
  const hasCams = m.cams.length > 0;
  const title = hasCams
    ? `${m.mountain} Live Webcam & Snow Cams | WhoGotSnow`
    : `${m.mountain} Snow Forecast | WhoGotSnow`;
  const description = hasCams
    ? `Live ${m.mountain} ski resort webcams (${m.region}). Watch mountain conditions on WhoGotSnow — cams ranked with modeled snowfall via Open-Meteo.`
    : `Modeled snowfall and a ski-cam placeholder for ${m.mountain} (${m.region}) on WhoGotSnow. Save it to your homepage while we source a live feed.`;
  const pageUrl = `${SITE}/mountains/${m.slug}.html`;
  const regionHref = `/regions/${slugifyMountain(m.region)}.html`;
  const camBlocks = hasCams
    ? m.cams
        .map((cam) => {
          const media =
            cam.type === 'image'
              ? `<img class="is-loaded" src="${escapeHtml(cam.url)}" alt="${escapeHtml(cam.name)} webcam" loading="lazy" width="640" height="360" />`
              : `<iframe src="${escapeHtml(cam.url)}" title="${escapeHtml(cam.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
          return `      <article class="card mountain-cam">
        <div class="card-feed">${media}</div>
        <header class="card-header">
          <h2 class="card-title">${escapeHtml(cam.name)}</h2>
          <p class="card-meta"><span class="card-region">${escapeHtml(cam.region)}</span>${cam.provider ? ` <span>${escapeHtml(cam.provider)}</span>` : ''}</p>
        </header>
      </article>`;
        })
        .join('\n')
    : `      <p class="grid-empty">No live cam yet. Save ${escapeHtml(m.mountain)} to your homepage for the snow model — we’ll add a feed when we have a stable one.</p>`;

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
    <meta name="theme-color" content="#101214" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
${FONT_LINK}
    <link rel="stylesheet" href="/styles.css?v=20260902-catalog" />
${GA_LOADER}
    <script type="application/ld+json">
${JSON.stringify(mountainJsonLd(m), null, 2)}
    </script>
  </head>
  <body class="mountain-page">
${SITE_NAV}
    <header class="header mountain-header">
      <p class="brand-kicker"><a href="${regionHref}">${escapeHtml(m.region)}</a></p>
      <h1 class="title">${escapeHtml(m.mountain)}</h1>
      <p class="subtitle">${
        hasCams
          ? `Live webcam${m.cams.length > 1 ? 's' : ''} — compare snow on the <a href="/">powder radar</a>`
          : `Snow model is live. Cam feed still to come — compare snow on the <a href="/">powder radar</a>`
      }</p>
      <p class="mountain-cam-count">${
        hasCams
          ? `${m.cams.length} cam${m.cams.length === 1 ? '' : 's'} on this mountain`
          : 'Cam coming'
      }</p>
      <div class="mountain-toolbar">
        <button type="button" class="btn-save-home" data-mountain-slug="${escapeHtml(m.slug)}">☆ Save to homepage</button>
        ${m.website ? `<a href="${escapeHtml(m.website)}" rel="noopener noreferrer" target="_blank">Official site</a>` : ''}
      </div>
    </header>
    <main class="grid mountain-grid">
${camBlocks}
    </main>
    ${
      m.latitude != null && m.longitude != null
        ? `<section
      class="mountain-forecast card-forecast"
      id="mountainForecast"
      data-lat="${m.latitude}"
      data-lon="${m.longitude}"
      data-name="${escapeHtml(m.mountain)}"
      aria-label="7-day weather forecast for ${escapeHtml(m.mountain)}"
    >
      <p class="forecast-loading">Loading forecast…</p>
    </section>
    <script src="/mountain-forecast.js" defer></script>`
        : ''
    }
    <section class="seo-note">
      <p>
        Snow rankings on the homepage use Open-Meteo model estimates, not official
        ${escapeHtml(m.mountain)} snow reports. Cam feeds are public resort or provider streams.
      </p>
      <p><a href="${regionHref}">More in ${escapeHtml(m.region)}</a> · <a href="/directory.html">Browse all mountains</a> · <a href="/">Back to WhoGotSnow</a></p>
    </section>
    <footer class="footer">
      <p class="footer-brand"><a href="/"><em>Who</em>GotSnow</a></p>
      <nav class="footer-nav" aria-label="Footer">
        <a href="/">Home</a>
        <a href="/directory.html">Mountains</a>
        <a href="/faq.html">FAQ</a>
      </nav>
    </footer>
    <script type="module" src="/favorite-button.js"></script>
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

function pageChrome({ title, description, canonicalPath, jsonLd, bodyClass, bodyHtml }) {
  const jsonLdBlock = jsonLd
    ? `    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${SITE}${canonicalPath}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="WhoGotSnow" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="${SITE}${canonicalPath}" />
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
    <meta name="theme-color" content="#101214" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
${FONT_LINK}
    <link rel="stylesheet" href="/styles.css?v=20260902-catalog" />
${GA_LOADER}
${jsonLdBlock}
  </head>
  <body class="${bodyClass}">
${SITE_NAV}
${bodyHtml}
    <footer class="footer">
      <p class="footer-brand"><a href="/"><em>Who</em>GotSnow</a></p>
      <nav class="footer-nav" aria-label="Footer">
        <a href="/">Home</a>
        <a href="/directory.html">Mountains</a>
        <a href="/faq.html">FAQ</a>
      </nav>
    </footer>
  </body>
</html>
`;
}

function buildDirectoryInnerHtml() {
  const hubLinks = regions
    .map(
      ([region, list]) =>
        `        <a href="/regions/${slugifyMountain(region)}.html">${escapeHtml(region)} <span>${list.length}</span></a>`
    )
    .join('\n');
  const regionBlocks = regions
    .map(([region, list]) => {
      const items = list
        .map((m) => {
          const camLabel = m.cams.length
            ? `${m.cams.length} cam${m.cams.length === 1 ? '' : 's'}`
            : 'cam coming';
          return `          <li><a href="/mountains/${m.slug}.html">${escapeHtml(m.mountain)}</a> <span class="dir-cam-count">${camLabel}</span></li>`;
        })
        .join('\n');
      return `      <div class="dir-region">
        <h3><a href="/regions/${slugifyMountain(region)}.html">${escapeHtml(region)}</a></h3>
        <ul>
${items}
        </ul>
      </div>`;
    })
    .join('\n');

  return `    <header class="header static-header">
      <p class="brand-kicker">Coverage</p>
      <h1 class="title">Directory</h1>
      <p class="subtitle">
        ${stats.mountains} mountains · ${stats.withCams} with live cams · ${stats.cams} feeds.
        Save hills to your homepage; open a mountain for snow and cams.
      </p>
    </header>
    <div class="dir-search">
      <input type="search" id="dirSearch" placeholder="Search mountains or states" aria-label="Search directory" />
    </div>
    <nav class="region-hubs" aria-label="Regions">
${hubLinks}
    </nav>
    <main class="seo-directory static-main" id="directory">
      <div class="dir-grid">
${regionBlocks}
      </div>
    </main>
    <script type="module" src="/directory.js"></script>`;
}

function directoryJsonLd() {
  return {
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
}

function faqInnerHtml() {
  return `    <header class="header static-header">
      <p class="brand-kicker">About</p>
      <h1 class="title">FAQ</h1>
      <p class="subtitle">Cams, snow totals, and what this site is for.</p>
    </header>
    <main class="faq static-main" id="faq">
      <details>
        <summary>What is WhoGotSnow?</summary>
        <p>
          WhoGotSnow is a free live-cam and snow brief for skiers: North American mountain webcams
          in one grid, ranked by modeled snowfall so you can see who’s getting snow.
        </p>
      </details>
      <details>
        <summary>Are the snow totals official resort reports?</summary>
        <p>
          No. Totals come from the
          <a href="https://open-meteo.com/" rel="noopener noreferrer" target="_blank">Open-Meteo</a>
          weather model — useful for comparing mountains, not a substitute for official resort reports
          or avalanche advisories.
        </p>
      </details>
      <details>
        <summary>Which resorts are covered?</summary>
        <p>
          The directory lists ${stats.mountains} mountains across the US and Canada.
          ${stats.withCams} currently have live cams; the rest have a snow-model page you can save
          to your homepage while we source a feed. See the
          <a href="/directory.html">mountain directory</a>.
        </p>
      </details>
      <details>
        <summary>How often do cams refresh?</summary>
        <p>
          Still-image cams refresh on a timer (default 5 minutes; change it under Filters &amp;
          refresh). Embedded live cams update according to the resort provider.
        </p>
      </details>
    </main>`;
}

function faqJsonLd() {
  return {
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
          text: `WhoGotSnow lists ${stats.mountains} mountains, including ${mountainNames.slice(0, 12).join(', ')}, with live cams on ${stats.withCams} of them so far.`,
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
}

function regionPageHtml(region, list) {
  const slug = slugifyMountain(region);
  const withCams = list.filter((m) => m.cams.length).length;
  const items = list
    .map((m) => {
      const camLabel = m.cams.length
        ? `${m.cams.length} cam${m.cams.length === 1 ? '' : 's'}`
        : 'cam coming';
      return `        <li><a href="/mountains/${m.slug}.html">${escapeHtml(m.mountain)}</a> <span class="dir-cam-count">${camLabel}</span></li>`;
    })
    .join('\n');
  return pageChrome({
    title: `${region} Ski Resorts & Snow Cams | WhoGotSnow`,
    description: `${list.length} ski mountains in ${region} on WhoGotSnow — ${withCams} with live cams, plus modeled snowfall pages you can save to your homepage.`,
    canonicalPath: `/regions/${slug}.html`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${region} ski mountains on WhoGotSnow`,
      numberOfItems: list.length,
      itemListElement: list.map((m, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE}/mountains/${m.slug}.html`,
        name: m.mountain,
      })),
    },
    bodyClass: 'static-page',
    bodyHtml: `    <header class="header static-header">
      <p class="brand-kicker"><a href="/directory.html">Directory</a> · ${escapeHtml(region)}</p>
      <h1 class="title">${escapeHtml(region)}</h1>
      <p class="subtitle">
        ${list.length} mountains · ${withCams} with live cams.
        Save the ones you check, or return to the <a href="/">powder radar</a>.
      </p>
    </header>
    <main class="seo-directory static-main">
      <div class="dir-region">
        <ul>
${items}
        </ul>
      </div>
    </main>`,
  });
}

async function writeRegionPages() {
  const dir = path.join(ROOT, 'regions');
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const [region, list] of regions) {
    await writeFile(path.join(dir, `${slugifyMountain(region)}.html`), regionPageHtml(region, list));
  }
}

async function writeDirectoryPage() {
  const html = pageChrome({
    title: 'Ski Resort Directory | WhoGotSnow',
    description: `Browse ${stats.mountains} North American ski mountains on WhoGotSnow — ${stats.withCams} with live cams, plus snow-model pages you can save to your homepage.`,
    canonicalPath: '/directory.html',
    jsonLd: directoryJsonLd(),
    bodyClass: 'static-page',
    bodyHtml: buildDirectoryInnerHtml(),
  });
  await writeFile(path.join(ROOT, 'directory.html'), html);
}

async function writeFaqPage() {
  const html = pageChrome({
    title: 'FAQ | WhoGotSnow',
    description:
      'FAQ for WhoGotSnow: live ski cams, Open-Meteo snow totals, resort coverage, and how often webcams refresh.',
    canonicalPath: '/faq.html',
    jsonLd: faqJsonLd(),
    bodyClass: 'static-page',
    bodyHtml: faqInnerHtml(),
  });
  await writeFile(path.join(ROOT, 'faq.html'), html);
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

  return [website, app]
    .map((obj) => `    <script type="application/ld+json">\n${JSON.stringify(obj, null, 6)}\n    </script>`)
    .join('\n');
}

async function injectIndexHtml() {
  const indexPath = path.join(ROOT, 'index.html');
  let html = await readFile(indexPath, 'utf8');

  const jsonLdRe = /<!-- SEO_JSONLD_START -->[\s\S]*?<!-- SEO_JSONLD_END -->/;
  if (!jsonLdRe.test(html)) {
    throw new Error('Missing SEO_JSONLD markers in index.html');
  }
  html = html.replace(
    jsonLdRe,
    `<!-- SEO_JSONLD_START -->\n${buildHomeJsonLd()}\n    <!-- SEO_JSONLD_END -->`
  );

  // Remove legacy homepage directory block if still present
  html = html.replace(
    /\s*<!-- SEO_DIRECTORY_START -->[\s\S]*?<!-- SEO_DIRECTORY_END -->\s*/,
    '\n\n    '
  );

  await writeFile(indexPath, html);
}

async function main() {
  await writeRobots();
  await writeSitemap();
  await writeLlmsTxt();
  await writeManifest();
  await writeMountainPages();
  await writeRegionPages();
  await writeDirectoryPage();
  await writeFaqPage();
  await injectIndexHtml();
  console.log(
    `SEO generated: ${mountains.length} mountain pages, ${regions.length} region hubs, directory, FAQ, sitemap, robots.txt, llms.txt, manifest, index JSON-LD.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
