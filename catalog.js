import { RESORTS } from './resorts.js';
import { MOUNTAIN_CATALOG } from './mountains-catalog.js';
import { DISCOVERED_CAMS } from './discovered-cams.js';

const CANADA_REGIONS = new Set(['Alberta', 'British Columbia', 'Quebec']);

/** @type {ReturnType<typeof buildCatalog> | null} */
let cached = null;

export function slugifyMountain(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function mountainPageHref(mountainOrSlug) {
  const slug = slugifyMountain(mountainOrSlug);
  return slug ? `/mountains/${slug}.html` : '/directory.html';
}

export function regionPageHref(region) {
  const slug = slugifyMountain(region);
  return slug ? `/regions/${slug}.html` : '/directory.html';
}

function isSnowStakeCam(resort) {
  return /snow\s*stake|snowstake/i.test(`${resort.name} ${resort.id}`);
}

function countryForRegion(region) {
  return CANADA_REGIONS.has(region) ? 'CA' : 'US';
}

function buildCatalog() {
  const allCams = [...RESORTS, ...DISCOVERED_CAMS];
  const camsByMountain = new Map();
  for (const resort of allCams) {
    const key = resort.mountain || resort.id;
    if (!camsByMountain.has(key)) camsByMountain.set(key, []);
    camsByMountain.get(key).push(resort);
  }

  const bySlug = new Map();
  for (const row of MOUNTAIN_CATALOG) {
    bySlug.set(row.slug, { ...row, cams: [] });
  }

  for (const [name, cams] of camsByMountain) {
    const slug = slugifyMountain(name);
    let entry = [...bySlug.values()].find((row) => row.name === name) || bySlug.get(slug);
    if (!entry) {
      const sample = cams[0];
      entry = {
        name,
        slug,
        region: sample.region || '',
        country: countryForRegion(sample.region),
        latitude: sample.latitude ?? null,
        longitude: sample.longitude ?? null,
        website: '',
        cams: [],
      };
      bySlug.set(slug, entry);
    }
    entry.cams = cams;
    if (entry.latitude == null && cams[0].latitude != null) {
      entry.latitude = cams[0].latitude;
      entry.longitude = cams[0].longitude;
    }
  }

  return [...bySlug.values()].sort(
    (a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name)
  );
}

export function allMountains() {
  if (!cached) cached = buildCatalog();
  return cached;
}

export function mountainBySlug(slug) {
  return allMountains().find((row) => row.slug === slug) || null;
}

export function mountainByName(name) {
  return allMountains().find((row) => row.name === name) || mountainBySlug(slugifyMountain(name));
}

export function mountainsWithCams() {
  return allMountains().filter((row) => row.cams.length > 0);
}

export function homepageCam(mountain) {
  const cams = mountain?.cams || [];
  if (!cams.length) return null;
  return cams.find((cam) => cam.home) || cams.find((cam) => !isSnowStakeCam(cam)) || cams[0];
}

export function weatherLocations(favoriteSlugs = []) {
  const fav = new Set(favoriteSlugs);
  return allMountains()
    .filter((row) => (row.cams.length > 0 || fav.has(row.slug)) && row.latitude != null && row.longitude != null)
    .map((row) => ({
      mountain: row.name,
      slug: row.slug,
      region: row.region,
      latitude: row.latitude,
      longitude: row.longitude,
      sampleId: homepageCam(row)?.id || row.slug,
    }));
}

export function camCount(mountain) {
  return mountain?.cams?.length || 0;
}

export function catalogStats() {
  const mountains = allMountains();
  const regions = [...new Set(mountains.map((row) => row.region).filter(Boolean))].sort();
  const withCams = mountains.filter((row) => row.cams.length > 0);
  return {
    mountains: mountains.length,
    cams: mountains.reduce((n, row) => n + row.cams.length, 0),
    withCams: withCams.length,
    regions,
    regionCount: regions.length,
  };
}
