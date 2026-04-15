/**
 * Curated post URLs for which we expose scrape-to-scrape deltas and portfolio run comparison.
 * Matching is by stable identity (Instagram shortcode, TikTok numeric video id, or vt/vm path code).
 */

const SEED_URLS = [
  'https://www.instagram.com/reel/DVnGKFIEnAJ/',
  'https://www.instagram.com/reel/DTriTtlAOT1/',
  'https://www.instagram.com/reel/DVKjWOmk_fi/?igsh=cTB5d280azBtZXgz',
  'https://www.instagram.com/p/DVxjX2rk1qF/',
  'https://www.instagram.com/reel/DWBs83TzinB/',
  'https://www.instagram.com/p/DVJEah1D_I-/?img_index=1',
  'https://www.instagram.com/p/DVnihJ9kiQP/',
  'https://www.instagram.com/reel/DUX0WzZAauU/?igsh=Zm41NHE5dTA4eGdy',
  'https://www.instagram.com/reel/DWg5_A-Ex6B/',
  'https://www.instagram.com/reel/DUpX8AsAVpJ/?igsh=ZXh6dXFxMXJzdzNj',
  'https://www.instagram.com/reel/DT17OETEeNB/?igsh=MXJwejQ5MTJ3dXI2aQ==',
  'https://www.instagram.com/reel/DVduSp6EniV/?igsh=enpoanM2M3pyZXUw',
  'https://www.instagram.com/p/DVTGDCGj2jX/',
  'https://www.instagram.com/reel/DW2nMugEfRo/?igsh=MW9ybG54azJjNWNlaA==',
  'https://www.instagram.com/p/DWS4RZdEePj/?img_index=7&igsh=MXUyenE3ZnQ3ZWpwNg==',
  'https://www.instagram.com/reel/DUpVOsTEx8z/?igsh=ODVuNGRsdWRucG55',
  'https://www.instagram.com/reel/DV0h48BElVv/?igsh=ZXZnOXg4bnJpcXpk',
  'https://www.instagram.com/reel/DUmiQnmk3zD/?igsh=MWdwaG9qbW9jNjM1YQ==',
  'https://www.instagram.com/reel/DTugLrXgUHO/?igsh=MzN3c3FkZzdwdWNw',
  'https://www.instagram.com/reel/DTzeVsckpmx/?igsh=cXRqYWJ1YTJjZnUy',
  'https://www.instagram.com/reel/DVQhC1rkjeX/?igsh=MWdvZjk1ZmVvbG5rcQ==',
  'https://www.instagram.com/p/DWBF8SpCTjv/',
  'https://www.instagram.com/reel/DUh23gcD2of/?igsh=YW11OWpmbTF3c2Np',
  'https://www.instagram.com/reel/DWWTp45S9jP/',
  'https://www.instagram.com/reel/DVGWhSmEQXn/?igsh=MTltM3A2dGdrZm12Ng==',
  'https://www.instagram.com/p/DWS-wFeJn9M/',
  'https://www.instagram.com/reel/DWnVCYSkbLu/',
  'https://www.instagram.com/reel/DV7kU3xgZQ1/?igsh=MWRveXRpNHgyZDh1ag==',
  'https://www.instagram.com/reel/DUam2hdE7Np/?igsh=NmpsdHppcGJhZ245',
  'https://www.instagram.com/reel/DVQol6egaQT/?igsh=YWZxMTJibTducWFi',
  'https://www.instagram.com/reel/DV57TZ8E6VT/',
  'https://www.instagram.com/reel/DWy2iAciKW9/?igsh=NG4zdWlkZjQ5OG96',
  'https://www.instagram.com/p/DVh8a5Bki99/?img_index=3&igsh=aGNkbmY4dWtyazF4',
  'https://www.instagram.com/reel/DV_NLEGk2eV/',
  'https://www.tiktok.com/@travelbellyfun/video/7624025952179227912?_r=1&_t=ZS-95CL1AIW9Q5',
  'https://vt.tiktok.com/ZSHag8pNJ/',
  'https://vt.tiktok.com/ZSmfMvAUe/',
  'https://vt.tiktok.com/ZSuHkJLc9/',
  'https://vt.tiktok.com/ZSuVSQLnD/',
  'https://www.tiktok.com/@fadzilahmamat/video/7614744432344108309',
  'https://vt.tiktok.com/ZSaPVgrqQ/',
  'https://www.tiktok.com/@nabilahzdn196/video/7618220643837889810?_r=1&_t=ZS-94lWx6qMavQ',
  'https://www.tiktok.com/@heyhohey0312/video/7605784028041727253?_r=1&_t=ZS-93qpvIIUf7F',
  'https://www.tiktok.com/@swityie/video/7603724199256984853?_r=1&_t=ZS-93h8WTD0Zoy',
  'https://vt.tiktok.com/ZSmnjMdhc/',
  'https://vt.tiktok.com/ZSuHNB4HV/',
  'https://vt.tiktok.com/ZSm8n8ERF/',
  'https://vt.tiktok.com/ZSacgSLpq/',
  'https://vt.tiktok.com/ZSuyXJcJy/',
  'https://www.tiktok.com/@renne330/video/7618492899168128277?_r=1&_t=ZS-94mmECTFE6H',
  'https://vt.tiktok.com/ZSmFsC8Yt/',
  'https://www.tiktok.com/@thatonegowrlonline/video/7621046818670939410',
  'https://vt.tiktok.com/ZSmdDkgmW/',
  'https://vt.tiktok.com/ZSaBrDkvm/',
  'https://www.tiktok.com/@lydyia_curv/video/7615794054197972232?_r=1&_t=ZS-94cVntXWLWG',
  'https://vt.tiktok.com/ZSaBuky9j/',
  'https://www.instagram.com/reel/DUmiQnmk3zD/',
  'https://www.instagram.com/reel/DUh23gcD2of/',
  'https://www.instagram.com/p/DVh8a5Bki99/?img_index=3',
  'https://www.instagram.com/reel/DUX0WzZAauU/',
  'https://www.instagram.com/reel/DTugLrXgUHO/',
  'https://www.instagram.com/reel/DV0h48BElVv/',
  'https://www.instagram.com/reel/DTzeVsckpmx/',
  'https://www.instagram.com/p/DWS4RZdEePj/',
  'https://www.instagram.com/reel/DUpX8AsAVpJ/',
  'https://www.instagram.com/reel/DT17OETEeNB/',
  'https://vt.tiktok.com/ZSucWVJo9/',
  'https://vt.tiktok.com/ZSuRLwknN/',
  'https://vt.tiktok.com/ZSargKkAK/',
  'https://www.tiktok.com/@lydyia_curv/video/7615794054197972232',
  'https://www.tiktok.com/@ileyyy00/video/7596937344666651924',
  'https://www.tiktok.com/@renne330/video/7618492899168128277',
];

/**
 * @param {string} url
 * @returns {string|null} stable key for allowlist membership
 */
function urlToMetricIdentityKey(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  let u;
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const path = (u.pathname || '/').replace(/\/+$/, '') || '/';

  if (host.includes('instagram.com') || host.includes('instagr.am')) {
    const m = path.match(/\/(?:reel|p|tv)\/([^/?#]+)/i);
    if (m) return `ig:${m[1].toLowerCase()}`;
    return null;
  }

  if (/\.tiktok\.com$/i.test(host) && !/^vt\./i.test(host) && !/^vm\./i.test(host)) {
    const m = path.match(/\/video\/(\d+)/);
    if (m) return `tt:${m[1]}`;
    return null;
  }

  if (/^vt\.tiktok\.com$/i.test(host) || /^vm\.tiktok\.com$/i.test(host)) {
    const parts = path.split('/').filter(Boolean);
    const code = parts[0];
    if (code) return `ttshort:${code.toLowerCase()}`;
    return null;
  }

  return null;
}

const ALLOWLIST_KEYS = new Set();
for (const u of SEED_URLS) {
  const k = urlToMetricIdentityKey(u);
  if (k) ALLOWLIST_KEYS.add(k);
}

function isHistoricalComparisonAllowedForUrl(url) {
  const k = urlToMetricIdentityKey(url);
  return Boolean(k && ALLOWLIST_KEYS.has(k));
}

module.exports = {
  urlToMetricIdentityKey,
  isHistoricalComparisonAllowedForUrl,
  ALLOWLIST_KEYS,
};
