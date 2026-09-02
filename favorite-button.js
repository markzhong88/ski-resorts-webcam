import { loadFavoriteSlugs, toggleFavoriteSlug } from './favorites.js';

const slugs = loadFavoriteSlugs();

function bind(btn) {
  const slug = btn.dataset.mountainSlug;
  if (!slug) return;
  const sync = () => {
    const on = slugs.has(slug);
    btn.classList.toggle('is-fav', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Remove from homepage' : 'Save to homepage');
    btn.textContent = on ? '★ Saved' : '☆ Save to homepage';
  };
  sync();
  btn.addEventListener('click', () => {
    toggleFavoriteSlug(slugs, slug);
    sync();
  });
}

document.querySelectorAll('[data-mountain-slug]').forEach(bind);
