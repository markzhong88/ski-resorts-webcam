import { RESORTS, IMAGE_REFRESH_MS } from './resorts.js';

const grid = document.getElementById('webcamGrid');
const refreshSelect = document.getElementById('refreshInterval');
const refreshBtn = document.getElementById('refreshNow');

let refreshIntervalId = null;
let refreshMs = parseInt(refreshSelect.value, 10) || IMAGE_REFRESH_MS;

function getImageUrl(url) {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_=${Date.now()}`;
}

function formatTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createCard(resort) {
  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = resort.id;

  const header = document.createElement('header');
  header.className = 'card-header';
  header.innerHTML = `
    <h2 class="card-title">${escapeHtml(resort.name)}</h2>
    <div class="card-meta">
      ${resort.region ? `<span class="card-region">${escapeHtml(resort.region)}</span>` : ''}
    </div>
  `;
  card.appendChild(header);

  const feed = document.createElement('div');
  feed.className = 'card-feed';

  if (resort.type === 'iframe') {
    const iframe = document.createElement('iframe');
    iframe.src = resort.url;
    iframe.title = resort.name;
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.allowFullscreen = true;
    feed.appendChild(iframe);
  } else {
    const img = document.createElement('img');
    img.alt = resort.name;
    img.loading = 'lazy';
    img.src = getImageUrl(resort.url);
    img.dataset.originalUrl = resort.url;

    img.onerror = () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder error';
      placeholder.textContent = 'Webcam unavailable';
      feed.appendChild(placeholder);
      img.remove();
    };

    img.onload = () => {
      const updated = card.querySelector('.card-updated');
      if (updated) updated.textContent = `Updated ${formatTime(Date.now())}`;
    };

    feed.appendChild(img);

    const updated = document.createElement('div');
    updated.className = 'card-updated';
    updated.textContent = 'Loading…';
    card.appendChild(feed);
    card.appendChild(updated);
    return card;
  }

  card.appendChild(feed);
  return card;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function render() {
  grid.innerHTML = '';
  RESORTS.forEach((resort) => {
    grid.appendChild(createCard(resort));
  });
}

function refreshAllImages() {
  grid.querySelectorAll('.card-feed img').forEach((img) => {
    if (img.dataset.originalUrl) {
      img.src = getImageUrl(img.dataset.originalUrl);
    }
  });
  grid.querySelectorAll('.card-updated').forEach((el) => {
    el.textContent = `Refreshed ${formatTime(Date.now())}`;
  });
}

function startRefreshInterval() {
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  refreshIntervalId = setInterval(refreshAllImages, refreshMs);
}

refreshSelect.addEventListener('change', () => {
  refreshMs = parseInt(refreshSelect.value, 10);
  startRefreshInterval();
});

refreshBtn.addEventListener('click', () => {
  refreshAllImages();
});

// Initial render and interval
render();
startRefreshInterval();

// Total visits counter (CountAPI — free, no backend)
const visitEl = document.getElementById('visitCount');
if (visitEl) {
  fetch('https://api.countapi.xyz/hit/ski-resorts-webcam/visits')
    .then((r) => r.json())
    .then((data) => {
      if (data.value != null) visitEl.textContent = data.value.toLocaleString();
    })
    .catch(() => {});
}
