import { RESORTS } from './resorts.js';

function slugifyMountain(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const FAV_KEY = 'ski-webcam-favorite-mountains';
const LEGACY_FAV_KEY = 'ski-webcam-favorites';

export function loadFavoriteSlugs() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) || 'null');
    if (Array.isArray(raw)) return new Set(raw.filter(Boolean));
  } catch {
    /* fall through to legacy */
  }

  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_FAV_KEY) || '[]');
    if (!Array.isArray(legacy) || !legacy.length) return new Set();
    const slugs = new Set();
    for (const id of legacy) {
      const resort = RESORTS.find((row) => row.id === id);
      if (resort) slugs.add(slugifyMountain(resort.mountain || resort.id));
    }
    if (slugs.size) saveFavoriteSlugs(slugs);
    return slugs;
  } catch {
    return new Set();
  }
}

export function saveFavoriteSlugs(slugs) {
  localStorage.setItem(FAV_KEY, JSON.stringify([...slugs]));
}

export function toggleFavoriteSlug(slugs, slug) {
  if (slugs.has(slug)) slugs.delete(slug);
  else slugs.add(slug);
  saveFavoriteSlugs(slugs);
  return slugs;
}
