/**
 * Site-wide analytics — single source of truth for GA.
 * Loaded by homepage + generated mountain/directory/FAQ pages.
 */
const GA_ID = 'G-FCWLVS58N8';

window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
window.gtag = gtag;

gtag('js', new Date());
gtag('config', GA_ID);

const s = document.createElement('script');
s.async = true;
s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
document.head.appendChild(s);
