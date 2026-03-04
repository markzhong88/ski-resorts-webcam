/**
 * Ski resort webcam configuration.
 * Add your favorite resorts: each needs a name and a webcam URL.
 * - For image feeds: use the direct image URL (e.g. .jpg). The page will auto-refresh every 5 min.
 * - For live pages: use type: 'iframe' and the full page URL to embed.
 *
 * FEED SOURCES (provider field):
 *
 * • Brownrice — Brownrice Internet (brownrice.com) hosts live webcams for many ski resorts.
 *   They offer HD streaming, time-lapses, and embeddable players. We use their direct
 *   snapshot URLs (e.g. streamer7.brownrice.com/cam-images/…) so we get a still image
 *   that auto-refreshes without a play button. Same pattern as Okemo, Beaver Creek, Hunter.
 *
 * • HDRelay — HDRelay (hdrelay.com) provides live IP camera streaming and hardware for
 *   resorts, golf, construction, etc. Feeds expose a /snapshot or /camera/…/snapshot
 *   URL that returns the current frame. We use those for Killington and Snowbird.
 *
 * • Other providers: Epic (common.snow.com), resort-owned (skilouise, chamonix, skircr),
 *   YouTube embeds, Windy (imgproxy.windy.com).
 */
export const RESORTS = [
  {
    id: 'vail-back-bowls',
    name: 'Vail — The Back Bowls',
    url: 'https://live9.brownrice.com/cam-images/vailch21.jpg',
    type: 'image',
    region: 'Colorado',
    provider: 'Brownrice',
  },
  {
    id: 'vail-stake',
    name: 'Vail — Snow Stake',
    url: 'https://common.snow.com/Mtncams/VailSnowStake.jpg',
    type: 'image',
    region: 'Colorado',
    provider: 'Epic (Vail Resorts)',
  },
  {
    id: 'lake-louise-1',
    name: 'Lake Louise — Gondola Top',
    url: 'https://cams.skilouise.com/cam1.jpg',
    type: 'image',
    region: 'Alberta',
    provider: 'Lake Louise',
  },
  {
    id: 'lake-louise-2',
    name: 'Lake Louise — Base Area',
    url: 'https://cams.skilouise.com/cam2.jpg',
    type: 'image',
    region: 'Alberta',
    provider: 'Lake Louise',
  },
  {
    id: 'lake-louise-3',
    name: 'Lake Louise — Ptarmigan',
    url: 'https://cams.skilouise.com/cam3.jpg',
    type: 'image',
    region: 'Alberta',
    provider: 'Lake Louise',
  },
  {
    id: 'vail-backbowls',
    name: 'Vail — Legendary Back Bowls (Sun Up)',
    url: 'https://live9.brownrice.com/cam-images/vailch11.jpg',
    type: 'image',
    region: 'Colorado',
    provider: 'Brownrice',
  },
  {
    id: 'beaver-creek-spruce',
    name: 'Beaver Creek — Spruce Saddle',
    url: 'https://streamer7.brownrice.com/cam-images/bcspruce.jpg',
    type: 'image',
    region: 'Colorado',
    provider: 'Brownrice',
  },
  {
    id: 'hunter-main',
    name: 'Hunter Mountain — Base Area',
    url: 'https://live8p.brownrice.com/cam-images/hunter1.jpg',
    type: 'image',
    region: 'New York',
    provider: 'Brownrice',
  },
  {
    id: 'sugarbush',
    name: 'Sugarbush — Gate House',
    url: 'https://www.youtube.com/embed/tdQOYaEQC3o?autoplay=1&mute=1&rel=0',
    type: 'iframe',
    region: 'Vermont',
    provider: 'YouTube',
  },
  {
    id: 'kicking-horse',
    name: 'Kicking Horse — Eagles Eye',
    url: 'https://secure.skircr.com/cams2/khcam3/final.jpg',
    type: 'image',
    region: 'British Columbia',
    provider: 'Kicking Horse (skircr)',
  },
  {
    id: 'whistler',
    name: 'Whistler — Roundhouse Lodge',
    url: 'https://live9.brownrice.com/cam-images/whistlerroundhouse.jpg',
    type: 'image',
    region: 'British Columbia',
    provider: 'Brownrice',
  },
  {
    id: 'brevent',
    name: 'Brévent (Chamonix)',
    url: 'https://en.chamonix.com/sites/default/files/styles/webcam_small/public/webcams/live/75.jpg',
    type: 'image',
    region: 'France',
    provider: 'Chamonix',
  },
  {
    id: 'sugarloaf',
    name: 'Sugarloaf — The Beach',
    url: 'https://www.youtube.com/embed/j8VVBhJdyqY?autoplay=1&mute=1&rel=0',
    type: 'iframe',
    region: 'Maine',
    provider: 'YouTube',
  },
  {
    id: 'jaypeak',
    name: 'Jay Peak — Tramside',
    url: 'https://imgproxy.windy.com/_/preview/plain/current/1793868258/original.jpg',
    type: 'image',
    region: 'Vermont',
    provider: 'Windy',
  },
  {
    id: 'whiteface',
    name: 'Whiteface — Lake Placid',
    url: 'https://imgproxy.windy.com/_/preview/plain/current/1748724797/original.jpg',
    type: 'image',
    region: 'New York',
    provider: 'Windy',
  },
  {
    id: 'okemo',
    name: 'Okemo — Sugar House Cam',
    url: 'https://live9.brownrice.com/cam-images/okemosugarhouse.jpg',
    type: 'image',
    region: 'Vermont',
    provider: 'Brownrice',
  },
  {
    id: 'killington',
    name: 'Killington — North Ridge',
    url: 'https://manage.hdrelay.com/snapshot/61e3ce02-faaa-4499-a547-6574ef6fa4f6?size=1082x614&f=60000',
    type: 'image',
    region: 'Vermont',
    provider: 'HDRelay',
  },
  {
    id: 'snowbird-hidden-peak',
    name: 'Snowbird — Hidden Peak 360',
    url: 'https://snowbird.roundshot.com/tv',
    type: 'iframe',
    region: 'Utah',
    provider: 'Roundshot',
  },
];

/** Refresh interval for image-type webcams (milliseconds). Default: 5 minutes. */
export const IMAGE_REFRESH_MS = 5 * 60 * 1000;
