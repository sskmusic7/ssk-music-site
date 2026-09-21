/**
 * Live catalogue stats for the homepage counters.
 *
 * This used to call the YouTube API on every single request. Each call costs
 * ~4 quota units (two pages of playlistItems plus a videos.list for each), and
 * the daily quota is 10,000 — so a couple of thousand page views exhausted it,
 * every later request threw, and the counters silently fell back to a
 * hardcoded 38,000,000. That's what "stuck on a stock count" was: not a stale
 * cache, but quota exhaustion serving a constant.
 *
 * Two caches fix it:
 *   FRESH_TTL  - what everyone is served. One upstream refresh every 6h, so
 *                the whole site costs ~16 quota units a day instead of 4 per
 *                visitor.
 *   STALE_TTL  - a long-lived copy of the last good reading. If YouTube fails
 *                or the quota is gone, we serve the real number we saw last
 *                rather than inventing one.
 *
 * SNAPSHOT is the floor: the summed view count of the catalogue as built by
 * scripts/build-discography.mjs. It's only used if both caches are cold AND
 * the API is unavailable — a real measurement rather than a round number.
 */

const FRESH_TTL = 6 * 60 * 60;        // 6 hours
const STALE_TTL = 30 * 24 * 60 * 60;  // 30 days

// Measured 2026-09-21 across 360 releases (71 tracks, 289 beats).
const SNAPSHOT = { youtube: 39222659, spotify: 17000000 };

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function json(body, { ttl = 0, status = 200 } = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      // Browsers may reuse it for a while; stale-while-revalidate keeps the
      // counters instant even on the request that triggers a refresh.
      'Cache-Control': ttl
        ? `public, max-age=${ttl}, stale-while-revalidate=${STALE_TTL}`
        : 'public, max-age=60',
    },
  });
}

async function totalPlaylistViews(key, playlistId) {
  let total = 0;
  let pageToken = '';
  let pages = 0;

  do {
    const listUrl =
      'https://www.googleapis.com/youtube/v3/playlistItems' +
      `?part=contentDetails&maxResults=50&playlistId=${playlistId}` +
      `&pageToken=${pageToken}&key=${key}`;
    const list = await (await fetch(listUrl)).json();
    if (list.error) throw new Error(list.error.message);
    if (!list.items?.length) break;

    const ids = list.items
      .map((i) => i.contentDetails?.videoId)
      .filter(Boolean)
      .join(',');
    if (!ids) break;

    const statsUrl =
      'https://www.googleapis.com/youtube/v3/videos' +
      `?part=statistics&id=${ids}&key=${key}`;
    const stats = await (await fetch(statsUrl)).json();
    if (stats.error) throw new Error(stats.error.message);

    for (const v of stats.items ?? []) {
      total += parseInt(v.statistics?.viewCount ?? 0, 10) || 0;
    }

    pageToken = list.nextPageToken ?? '';
    pages += 1;
  } while (pageToken && pages < 10);

  return total;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const cache = caches.default;

  const base = new URL(request.url).origin;
  const freshKey = new Request(`${base}/__stats/fresh`);
  const staleKey = new Request(`${base}/__stats/last-good`);

  // 1. Anyone inside the 6h window is served straight from the edge.
  const cached = await cache.match(freshKey);
  if (cached) return cached;

  const key = env.YOUTUBE_API_KEY;
  const playlistId =
    env.YOUTUBE_PLAYLIST_ID || 'PL60PtskKjky1r3e9iFacHX_laEZAxxE71';

  // 2. Cache miss: refresh from YouTube, then persist to both caches.
  if (key) {
    try {
      const youtube = await totalPlaylistViews(key, playlistId);

      // A zero here means the playlist came back empty rather than that the
      // catalogue lost its views — don't let that overwrite a good reading.
      if (youtube > 0) {
        const body = {
          youtube,
          spotify: SNAPSHOT.spotify,
          source: 'live',
          updated: new Date().toISOString(),
        };
        context.waitUntil(
          Promise.all([
            cache.put(freshKey, json(body, { ttl: FRESH_TTL })),
            cache.put(staleKey, json(body, { ttl: STALE_TTL })),
          ])
        );
        return json(body, { ttl: FRESH_TTL });
      }
    } catch (err) {
      // Quota exhaustion lands here. Fall through to the last good reading.
      console.error('[stats] youtube refresh failed:', err.message);
    }
  }

  // 3. Upstream is unavailable — serve the last real number we recorded.
  const stale = await cache.match(staleKey);
  if (stale) {
    const body = await stale.json();
    return json({ ...body, source: 'stale' }, { ttl: 300 });
  }

  // 4. Nothing cached and no API: the measured catalogue snapshot.
  return json({ ...SNAPSHOT, source: 'snapshot' }, { ttl: 300 });
}
