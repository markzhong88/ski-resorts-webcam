# Ski Resort Webcams

A single-page app that shows your favorite ski resort webcam feeds in one grid. No backend required.

## Run locally

From the project folder:

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

Or use any static server, e.g.:

```bash
npx serve . -l 3000
# or
python3 -m http.server 3000
```

(ES modules are used, so opening `index.html` directly via `file://` may not work; use a local server.)

## Adding or editing resorts

Edit **`resorts.js`**. Each resort has:

- **`id`** — unique string (e.g. `'vail-bluesky'`)
- **`name`** — label shown on the card
- **`url`** — webcam image URL (e.g. `https://.../cam.jpg`) or, for embeds, the iframe page URL
- **`type`** — `'image'` (refreshed automatically) or `'iframe'` (embedded page)
- **`region`** — optional (e.g. `'Colorado'`)

**Image feeds:** Use a direct image URL (`.jpg`, `.png`, etc.). The page will refresh these on a timer (default 5 minutes; change it in the header dropdown or in `IMAGE_REFRESH_MS` in `resorts.js`).

**Iframe feeds:** Set `type: 'iframe'` and use the full page URL. Not all resort pages allow embedding (X-Frame-Options may block).

## Finding webcam URLs

Many resorts expose a static image that updates every few minutes. To find it:

1. Open the resort’s webcam page.
2. Right‑click the webcam image → “Copy image address” or inspect the `<img>` `src`.
3. Use that URL in `resorts.js`. If the site uses a token or redirect, the URL might not work when hot‑linked; in that case try an iframe to the webcam page if the site allows it.

## Files

- **`index.html`** — Page structure and header controls
- **`styles.css`** — Layout and theme
- **`app.js`** — Renders the grid and handles refresh
- **`resorts.js`** — List of resorts and refresh interval
