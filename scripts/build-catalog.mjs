/**
 * Build mountains-catalog.js from OpenSkiMap ski_areas.geojson + existing RESORTS.
 *
 * Usage:
 *   node scripts/build-catalog.mjs /tmp/ski_areas.geojson
 *
 * Source: https://tiles.openskimap.org/geojson/ski_areas.geojson
 * Existing cam mountains keep their names, slugs, and coordinates.
 */
import { writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESORTS } from '../resorts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CANADA_REGIONS = new Set(['Alberta', 'British Columbia', 'Quebec']);

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function simplify(name) {
  return slugify(
    String(name || '')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\b(ski\s+area|ski\s+resort|mountain\s+resort|resort)\b/gi, ' ')
  );
}

function displayName(name) {
  return String(name || '')
    .replace(/\s*\([^)]*formerly[^)]*\)\s*/gi, ' ')
    .replace(/\s+(Mountain Resort|Ski Resort|Ski Area|Resort)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function liftCount(props) {
  const byType = props.statistics?.lifts?.byType || {};
  return Object.values(byType).reduce((sum, row) => sum + (row?.count || 0), 0);
}

function regionOf(props, country) {
  const places = props.places || [];
  const match = places.find((p) => p.iso3166_1Alpha2 === country);
  return match?.localized?.en?.region || '';
}

function websiteOf(props) {
  const sites = props.websites || [];
  return typeof sites[0] === 'string' ? sites[0] : sites[0]?.url || '';
}

function isJunkName(name) {
  return /summer area boundary|area boundary|high school hill|snowcat/i.test(name);
}

function uniqueSlug(base, taken, region) {
  if (!taken.has(base)) return base;
  const withRegion = `${base}-${slugify(region)}`;
  if (!taken.has(withRegion)) return withRegion;
  let i = 2;
  while (taken.has(`${withRegion}-${i}`)) i += 1;
  return `${withRegion}-${i}`;
}

function fromResorts() {
  const map = new Map();
  for (const r of RESORTS) {
    const name = r.mountain || r.id;
    if (!map.has(name)) {
      map.set(name, {
        name,
        slug: slugify(name),
        region: r.region,
        country: CANADA_REGIONS.has(r.region) ? 'CA' : 'US',
        latitude: r.latitude ?? null,
        longitude: r.longitude ?? null,
        website: '',
        source: 'cams',
      });
    } else {
      const row = map.get(name);
      if (row.latitude == null && r.latitude != null) {
        row.latitude = r.latitude;
        row.longitude = r.longitude;
      }
    }
  }
  return [...map.values()];
}

function fromOpenSkiMap(geojson) {
  const bestByKey = new Map();
  for (const feature of geojson.features || []) {
    const props = feature.properties || {};
    const isUS = (props.places || []).some((p) => p.iso3166_1Alpha2 === 'US');
    const downhill = (props.activities || []).includes('downhill');
    if (!isUS || !downhill || props.status !== 'operating' || !props.name) continue;
    if (liftCount(props) < 1) continue;
    if (isJunkName(props.name)) continue;

    const region = regionOf(props, 'US');
    if (!region) continue;
    const name = displayName(props.name);
    if (!name) continue;
    const point =
      feature.geometry?.type === 'Point'
        ? feature.geometry.coordinates
        : props.viewportHint?.center;
    const key = `${simplify(name)}|${slugify(region)}`;
    const row = {
      name,
      slug: slugify(name),
      region,
      country: 'US',
      latitude: point?.[1] != null ? Number(Number(point[1]).toFixed(5)) : null,
      longitude: point?.[0] != null ? Number(Number(point[0]).toFixed(5)) : null,
      website: websiteOf(props),
      source: 'openskimap',
      lifts: liftCount(props),
    };
    const prev = bestByKey.get(key);
    if (!prev || (row.lifts || 0) > (prev.lifts || 0)) bestByKey.set(key, row);
  }
  return [...bestByKey.values()].map(({ lifts, ...row }) => row);
}

function matchesExisting(osm, existing) {
  const osmSimple = simplify(osm.name);
  const osmRegion = slugify(osm.region);
  return existing.some((row) => {
    if (slugify(row.region) !== osmRegion) return false;
    const exSimple = simplify(row.name);
    return (
      osmSimple === exSimple ||
      osmSimple.startsWith(`${exSimple}-`) ||
      exSimple.startsWith(`${osmSimple}-`) ||
      osmSimple.includes(exSimple) ||
      exSimple.includes(osmSimple)
    );
  });
}

function build(geojson) {
  const existing = fromResorts();
  const taken = new Set(existing.map((row) => row.slug));
  const extra = [];
  for (const row of fromOpenSkiMap(geojson)) {
    if (matchesExisting(row, existing)) continue;
    const slug = uniqueSlug(row.slug, taken, row.region);
    taken.add(slug);
    extra.push({ ...row, slug });
  }
  const catalog = [...existing, ...extra].sort((a, b) => {
    return a.region.localeCompare(b.region) || a.name.localeCompare(b.name);
  });
  return catalog.map(({ source, ...row }) => row);
}

const geoPath = process.argv[2];
if (!geoPath) {
  console.error('Usage: node scripts/build-catalog.mjs /path/to/ski_areas.geojson');
  process.exit(1);
}

const geojson = JSON.parse(readFileSync(geoPath, 'utf8'));
const catalog = build(geojson);
const outPath = path.join(ROOT, 'mountains-catalog.js');
const body = `/**
 * Mountain catalog for WhoGotSnow.
 * Cam mountains come from resorts.js; additional US areas from OpenSkiMap (operating downhill, ≥1 lift).
 * Rebuild: node scripts/build-catalog.mjs /path/to/ski_areas.geojson
 */
export const MOUNTAIN_CATALOG = ${JSON.stringify(catalog, null, 2)};
`;
await writeFile(outPath, body);
const us = catalog.filter((m) => m.country === 'US').length;
const ca = catalog.filter((m) => m.country === 'CA').length;
const cams = fromResorts().length;
console.log(`Wrote ${catalog.length} mountains (${us} US, ${ca} Canada; ${cams} already have cams) → mountains-catalog.js`);
