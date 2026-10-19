# WhoGotSnow SEO audit (first pass)

Report only. The site was not changed for this audit.

Inspected on 19 October 2026 from the repository and the Google Search Console CSV exports in `~/Downloads/https___whogotsnow/`. Those CSVs were not copied into the repo.

## 1. Executive summary

WhoGotSnow is a free North American ski-cam browser: one homepage grid ranked by modeled snow, plus a static page per mountain. Search is not looking for the brand. It is looking for **“{resort} webcam”**.

Over the exported window the site recorded **6 clicks and 8,361 impressions** (27 July–17 October 2026). Almost all impressions land on mountain pages at average positions around **50–75**, where a near-zero CTR is expected. A smaller set of webcam queries already averages roughly **positions 11–30** (Taos, Mount Snow, Snowbird, Northstar, Mt. Norquay, Jay Peak, Crested Butte) and still has **0 clicks in the query export**. That is the only on-site opportunity with both demand and a matching page.

Do not build a snow-report content site. Those queries show up (429 impressions across 85 queries) but sit around positions 60–80, and the product is explicitly not an official snow report. Do not mass-rewrite all 49 mountain titles. Do not treat Sick Day as an SEO page yet: it has no row in the pages export.

**Single best next step:** tighten the title and meta description on the few mountain pages that already rank near page 2 for “{resort} webcam,” then remeasure after ski season starts. Details in section 6.

## 2. What the site is

**Purpose.** Live public resort webcams for North America, with a powder radar that ranks mountains by Open-Meteo modeled snowfall. Not official resort snow reports.

**Audience.** Skiers and snowboarders checking a specific hill before they go, mostly in the United States (5,677 of 8,361 impressions; all 6 clicks). Canada is second (590 impressions, 0 clicks).

**Main journeys.**

1. Homepage (`/`) — powder radar and one cam per mountain. The cam grid is rendered in JavaScript from `resorts.js`, so the mountain links Google can rely on are the static pages, not the homepage grid.
2. Directory (`/directory.html`) — crawlable list of mountain pages.
3. Mountain page (`/mountains/{slug}.html`) — the actual search landing page: H1 is the resort name, stills or embeds, a client-side 7-day forecast, and a note that snow totals are not official reports.
4. FAQ (`/faq.html`) — what the snow numbers mean.
5. Sick Day (`/sick-day.html`) — waitlist for a future email alert. Separate product, not what these queries ask for.

**Discoverability.** `robots.txt` allows all crawling and points at `https://whogotsnow.com/sitemap.xml`. The sitemap lists **53 URLs**: home, directory, FAQ, Sick Day, and 49 mountain pages. Every URL in the pages export is in the sitemap. Conventions are consistent: HTTPS, no `www`, `.html` paths, no trailing-slash variants in the data.

**Important pages vs. what Google shows.** The homepage is the product. Search traffic, such as it is, is the mountain pages. Homepage: 37 impressions, 1 click, average position 21. Directory: 72 impressions, 0 clicks, average position 29.6.

## 3. Search Console data and limits

| File | What it covers | Columns |
| --- | --- | --- |
| `Filters.csv` | Search type Web; date labeled “Last 3 months” | Filter, Value |
| `Chart.csv` | Daily site totals, **2026-07-27 through 2026-10-17** | Date, Clicks, Impressions, CTR, Position |
| `Queries.csv` | **1,000** query rows (GSC export cap is a real risk) | Top queries, Clicks, Impressions, CTR, Position |
| `Pages.csv` | **35** URLs | Top pages, Clicks, Impressions, CTR, Position |
| `Countries.csv` | Country totals | Country, Clicks, Impressions, CTR, Position |
| `Devices.csv` | Device totals | Device, Clicks, Impressions, CTR, Position |
| `Search appearance.csv` | One row: Videos | Search Appearance, Clicks, Impressions, CTR, Position |

**Totals that agree.** Chart clicks 6 / impressions 8,361. Countries clicks 6. Devices clicks 6 (mobile 5, desktop 1). Pages clicks 6 / impressions 8,390 (close to the chart; small reporting differences are normal).

**Totals that do not.** `Queries.csv` sums to **0 clicks and 4,698 impressions**. The six clicks are not visible on any query in this file. The file also stops at 1,000 rows, with the smallest included query at 2 impressions, so one-impression queries may be missing. Do not treat a 0% query CTR as proof nobody clicked that phrase.

**No query-to-page file.** A query cannot be pinned to a URL from this export. Where a mountain page is the only relevant URL on the site, that mapping is an inference, marked as such below.

**Average position is not a rank.** It is an impression-weighted average over ~3 months, mixed devices, and many query variants.

**Season.** This window is late summer into early fall, before most of these resorts are in winter operations. August had 4,622 impressions and 3 clicks. September had 2,583 impressions and 1 click. 1–17 October had 1,155 impressions and 1 click. Early August average positions were in the low 40s; from mid-August through September they sat in the 60s; late September and October moved back toward the 40s–50s. That swing is in the daily chart. This audit does not assign a cause.

**Devices.** Desktop: 8,004 impressions, 1 click, average position 59.5. Mobile: 348 impressions, 5 clicks, CTR 1.44%, average position 22.8. Tablet: 9 impressions. Most visibility is a deep desktop ranking. The clicks that exist are mostly mobile, where the average position is already much better. There is no Core Web Vitals or mobile-usability export here, so this is not evidence of a mobile bug.

**Videos.** Search appearance “Videos”: 1,623 impressions, 0 clicks, average position 74.9. Several mountain pages embed YouTube or Camstreamer iframes. Treat this as a side effect of those embeds, not a video strategy. No change recommended from this row alone.

**Pages in the sitemap with no Pages.csv row (18).** Absence is not proof they are unindexed. GSC often omits URLs with very few impressions. Still worth a manual URL inspection later, because several are major resorts:

`alta`, `big-bear`, `breckenridge`, `brighton`, `crystal-mountain`, `hunter-mountain`, `kicking-horse`, `mt-bachelor`, `park-city`, `snowbasin`, `stratton`, `sun-valley`, `sunday-river`, `telluride`, `tremblant`, `whistler-blackcomb`, `white-pass`, and `/sick-day.html`.

Big Bear and White Pass were added in the repo on 19 October 2026, after this export ends, so they could not appear here.

## 4. Query and page opportunities

### What is already “working”

Working is a strong word at 6 clicks. The pages that received clicks:

| Page | Clicks | Impressions | CTR | Avg position |
| --- | ---: | ---: | ---: | ---: |
| `/mountains/heavenly.html` | 2 | 368 | 0.54% | 70.1 |
| `/mountains/mount-snow.html` | 1 | 373 | 0.27% | 36.2 |
| `/mountains/jay-peak.html` | 1 | 303 | 0.33% | 53.7 |
| `/mountains/aspen.html` | 1 | 255 | 0.39% | 57.5 |
| `/` | 1 | 37 | 2.7% | 21 |

Heavenly, Jay Peak, and Aspen earned a click from a deep average position. That is too small to copy as a formula. Mount Snow is the more interesting click: more impressions and a better average position than the typical mountain page.

FAQ has average position 2.67 on **3 impressions** and 0 clicks. Ignore it. That is not a ranking win.

### Webcam queries with impressions and a better average position

These match the product. Clicks in this table are 0 because the query file has no clicks at all, not because a click was measured and lost.

| Query | Impressions | Avg position | Likely page (inferred, not joined) | Intent |
| --- | ---: | ---: | --- | --- |
| taos ski valley webcam | 61 | 11.8 | `/mountains/taos-ski-valley.html` (323 imps, pos 32.3) | Watch the cam |
| taos ski valley webcam live | 8 | 10.4 | same | Watch the cam |
| northstar webcam | 40 | 23.3 | `/mountains/northstar.html` (235 imps, pos 36.6) | Watch the cam |
| snowbird webcam | 25 | 25.2 | `/mountains/snowbird.html` (166 imps, pos 33.3) | Watch the cam |
| snowbird cameras | 12 | 13.1 | same | Watch the cam |
| snowbird live cam | 4 | 5.5 | same | Watch the cam |
| mount snow webcam | 23 | 14.8 | `/mountains/mount-snow.html` | Watch the cam |
| mt snow webcam | 22 | 16.8 | same | Watch the cam |
| mount snow live cam | 14 | 25.7 | same | Watch the cam |
| jay peak webcam | 18 | 26.9 | `/mountains/jay-peak.html` | Watch the cam |
| crested butte live cam | 16 | 29.4 | `/mountains/crested-butte.html` | Watch the cam |
| mt norquay webcam | 11 | 16.6 | `/mountains/mt-norquay.html` (75 imps, pos 18.7) | Watch the cam |
| norquay webcam | 12 | 15.8 | same | Watch the cam |

`mmountains96 cams` (53 impressions, position 23) does not look like a real resort query. Do nothing with it.

**Recommended action for the table above:** improve the existing mountain page title and description so the snippet says `{Resort} webcam` in plain language, and keep the live image above the fold (it already is). Do not create a second URL per resort.

**Why.** The intent is exactly the page. Titles today are one template from `scripts/generate-seo.mjs`: `{Mountain} Live Webcam & Snow Cams | WhoGotSnow`. Descriptions all mention Open-Meteo. That is accurate, but it is the same sentence on every resort, and “Snow Cams” is not how these queries are phrased. Sample sizes are small (tens of impressions), so this is a test, not a guaranteed traffic jump.

**Confidence:** medium for Taos, Mount Snow, Snowbird, Northstar, and Mt. Norquay. Lower for the long tail under 10 impressions.

### High-impression pages with weak CTR

Steamboat 534 impressions, Mammoth 499, Winter Park 431, Sugarloaf 398, Solitude 381, Vail 285. CTR is 0% and average positions are about **63–76**. At those positions, a 0% CTR does not mean the snippet is broken. It means the result is far down the page. Rewriting those titles first will not move them onto page 1.

Sugarloaf’s top query is `sugarloaf webcam` (122 impressions, position 70). Mammoth: `mammoth mountain webcam` (71, position 63). Revelstoke: `revelstoke webcam` (69, position 73). Same pattern, deeper rankings. The fix, if any, is relevance and links over time, not a new article.

### Queries the site should not chase as the main title

**Snow report** cluster: 85 queries, 429 impressions, 0 clicks in the query file, typical positions **60–80**. Examples: `winter park snow report` (21, pos 73), `copper mountain snow report` (17, pos 61), `jay peak snow report` (17, pos 72), `solitude snow report` (16, pos 74).

Intent is an official inches/trails/lifts report. WhoGotSnow shows cams plus a model forecast and already says the numbers are not official reports (`mountains/*.html` seo note, FAQ). Putting “snow report” in titles would mismatch the page and compete with the resort’s own report.

**Weather** queries (`sugarloaf maine weather`, `solitude utah weather`) are the same story: impressions in the 60–80s, and the page is not a forecast site.

**Action:** do nothing in titles. Keep the existing disclaimer.

### Homepage and brand

No query in the export contains “whogotsnow” or “who got snow.” The homepage is not how people enter from Google today. Its title (`WhoGotSnow — Live mountain cams ranked by snow`) already describes the product. The H1 (`See who got snow.`) is a brand line. Changing the H1 to a keyword is not justified by 37 impressions.

### Sick Day

No pages-export row. The page is indexable (`index, follow` in `sick-day.html`). There is no search evidence here that people query for this product. Leave it for the waitlist. Do not build SEO articles around “sick day.”

## 5. Technical findings

### Verified in the repo

- **Titles and descriptions exist** on home, directory, FAQ, Sick Day, and mountain pages. One H1 per mountain page, matching the resort name. Canonicals are self-referential `https://whogotsnow.com/...` URLs. No `noindex` except none found on money pages. Sick Day is indexable.
- **Sitemap and robots.txt** agree, and the sitemap includes the pages that matter. `changefreq` of `hourly` on the homepage does not make Google crawl hourly. Every sitemap `lastmod` is the generation date (`2026-10-19` in the current file), including pages whose visible copy did not change. That makes `lastmod` a weak signal. Low priority.
- **URL style** is consistent. Internal links in templates use root-relative paths (`/`, `/directory.html`, `/mountains/...`). No mixed trailing-slash pattern showed up in the GSC page list.
- **Mountain pages are thin and templated.** Same layout, same description pattern, unique cam images and resort name. They are real cam pages, not empty doorways, but they are easy for Google to treat as near-duplicates. That fits a site whose impressions are spread across many similar URLs at similar deep positions. Do not “fix” this by generating extra unique paragraphs that do not help someone looking at a cam.
- **JSON-LD country bug.** `scripts/generate-seo.mjs` sets `addressCountry` to `CA` only for Alberta and British Columbia. Quebec (Tremblant) is marked `US`. Small accuracy bug, not the reason for the impression chart.
- **Schema type.** Mountain pages use `SkiResort` for a third-party cam page. That can read as “this URL is the resort.” Safer type later would be `WebPage` (or `SkiResort` only if the page is clearly about the resort and the cam is one feature). Not a first change. No evidence in this data that the schema is helping or hurting.
- **Homepage links.** Nav and footer link to Directory, Sick Day, and FAQ. Mountain-to-mountain links do not exist. Each mountain page links to `/` (“powder radar”), `/directory.html`, and the same footer. Relevant sideways links are missing (see section 6).
- **`meta keywords` on the homepage** is ignored by Google. Harmless leftover. Not worth a project.

### Not verified from the repo

- Whether the 18 sitemap URLs missing from Pages.csv are indexed.
- Redirects, `www` to apex, or HTTP to HTTPS. Canonicals prefer apex HTTPS, but this audit did not fetch live response chains.
- Broken external cam URLs (a dead JPEG is a product bug and can make a landing page look empty; it was not crawl-tested here).
- Core Web Vitals, mobile usability, and index coverage. The device split does **not** show mobile rankings lagging desktop; mobile average position is better.

## 6. Internal linking

Only add links a skier would use. Do not link every mountain to every other mountain.

| Source | Destination | Anchor | Why |
| --- | --- | --- | --- |
| `/mountains/taos-ski-valley.html` | `/directory.html` | already “Browse all mountains” | Keep |
| Each mountain page in a region | 2–3 other mountains in that same region | `{Name} webcam` | Someone on the Taos page does not need a Vermont link. A Snowbird page linking to Alta and Brighton matches how people compare a range. Files: `scripts/generate-seo.mjs` (`mountainPageHtml`). |
| `/directory.html` | mountain URLs | resort name, which it already uses | Directory is the hub. Do not add a second directory. |
| `/` hero or radar section | the same mountain URLs | only if the link is in the server-rendered HTML, not only in the JS grid | Crawlers that do not execute the grid still need a path to mountain pages. The sitemap and directory already provide that path, so this is optional, not urgent. |
| Mountain pages | `/sick-day.html` | do not add a new “webcam” anchor to Sick Day | Different intent. Footer link is enough. |

Suggested first cluster, because those pages already have the better positions: New Mexico is only Taos, so link Taos back to the directory only. For Utah, link Snowbird, Alta, Brighton, Solitude, and Park City among themselves with webcam anchors. For Vermont, link Mount Snow, Jay Peak, Stowe, Killington, Okemo, Stratton, and Sugarbush the same way. Vermont query volume in this export is small (26 impressions on queries containing “vermont”), so the Utah and the already-ranking single pages matter more than a new Vermont hub.

## 7. Prioritized action plan

Ranked by likely impact on relevant cam traffic, then confidence, then effort, then risk.

### 1. Quick existing-page improvement — titles and descriptions on the near-page-2 mountains

**URLs:** `/mountains/taos-ski-valley.html`, `/mountains/mount-snow.html`, `/mountains/snowbird.html`, `/mountains/northstar.html`, `/mountains/mt-norquay.html`, `/mountains/jay-peak.html`, `/mountains/crested-butte.html`.

**File:** `scripts/generate-seo.mjs` (`title` and `description` inside `mountainPageHtml`), then regenerate those pages. Do not hand-edit only the HTML or the next generate will wipe it.

**Change shape (not implemented):** lead with the query, stay honest. Example title: `Taos Ski Valley Webcam — Live Mountain Cams | WhoGotSnow`. Example description: `Watch live Taos Ski Valley webcams (New Mexico). Base, ridge, and Kachina views on WhoGotSnow.` Drop the Open-Meteo clause from the meta description; keep it on the page.

**Evidence:** section 4 table. These are the webcam queries with the best average positions and enough impressions to notice a change later.

**Risk:** low if limited to these pages. High if the same experiment is applied blindly to all 49 pages that rank on page 5–8.

### 2. Existing-page improvement — same-region webcam links

**Files:** `scripts/generate-seo.mjs`. **URLs:** mountain pages, starting with Utah and Vermont resorts that already receive impressions.

**Evidence:** mountain pages currently only point “up” to home and the directory. The pages Google shows are the mountain URLs, so that is where a relevant link helps both users and crawl paths.

**Risk:** low if limited to the same region and a few links. High if every page gets a block of unrelated resorts.

### 3. Measurement, not a code change — URL inspection for famous resorts missing from Pages.csv

Check in Search Console, do not infer from the repo: Whistler Blackcomb, Alta, Breckenridge, Telluride, Park City, Tremblant, Brighton.

**Evidence:** they are in the sitemap and have static pages, but they have no pages-export row while lesser-known pages have 200–500 impressions. That can mean low impressions, or a discovery/indexing gap. Those are different fixes.

### 4. Small technical fix — Quebec country in JSON-LD

**File:** `scripts/generate-seo.mjs`, `addressCountry` in `mountainJsonLd`. Tremblant should be `CA`.

**Impact on this GSC window:** unknown and probably tiny. It is a clear factual error.

### 5. Do not start a content project before winter data

Impressions fell from August to October in the off-season. Judging “we need more pages” from this file will overfit to summer. Pull the same CSVs again in January, plus a **query + page** export.

### Do not change yet

- Homepage H1 and the Sick Day page, for SEO.
- Titles on Steamboat, Mammoth, Winter Park, Sugarloaf, Solitude, Vail, and other pages whose average position is ~60–75. Snippet tweaks will not show up at those positions.
- Any “{resort} snow report” or “{region} webcam” doorway set. No region query in this export is large enough, and snow-report intent does not match the page.
- Video schema or extra YouTube embeds for the Videos appearance row.
- Redirects, URL scheme, or removing mountain pages. Nothing in the data says a ranking page should be deleted.
- Mass unique AI copy on all mountain pages.

## 8. Content opportunities

No new article is justified as a top priority.

**Not recommended now**

- One page per “snow report.” 429 impressions spread over 85 queries, deep positions, wrong intent.
- A Vermont/Colorado/Utah hub. Region modifiers exist but are small (Vermont-word queries 26 impressions, Colorado-word queries 78, Utah-word queries 18) and the ranking URLs are already the resort pages.
- A Sick Day SEO article. No supporting queries in this export.

**Only if a later query+page export shows a real gap**

- A single page, not a series: “North American ski webcams” aimed at the head term, if the homepage still is not the URL Google chooses for that term. Today the homepage has 37 impressions, so Google is not asking for this yet. Intent would be “show me many cams,” which the homepage and directory already do. A new page would compete with them. Confidence this is needed: low.

Differentiation that already exists and should stay on the mountain page, not in a blog: the live image, the resort name, and the explicit “not an official snow report” line.

## 9. Missing data

1. **Query + page** export (or GSC API), so the Taos-style mapping stops being an inference.
2. Whether the 1,000-row query file dropped the queries that produced the 6 clicks.
3. Index coverage for Whistler, Alta, Breckenridge, Telluride, Park City, Tremblant.
4. A winter window (December–March) before deciding the template cannot rank.
5. Live redirect and canonical checks, only if URL inspection shows duplicates.
6. This audit did not use keyword tools. No search volumes or difficulty scores are claimed.

## Best next step

Change titles and meta descriptions for Taos Ski Valley, Mount Snow, Snowbird, Northstar, Mt. Norquay, Jay Peak, and Crested Butte so the snippet matches “{resort} webcam,” generate those pages from `scripts/generate-seo.mjs`, and leave every other URL alone until a winter Search Console export.
