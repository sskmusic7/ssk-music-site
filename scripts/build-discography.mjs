#!/usr/bin/env node
/**
 * Rebuild data/discography.json from the real YouTube catalogue.
 *
 *   node scripts/build-discography.mjs [--dry]
 *
 * Two sources, which is the beat/track split:
 *   TRACKS — playlist "Prod. by SSK": artist releases SSK produced
 *   BEATS  — @SSKMusicBeats channel uploads: type beats
 *
 * The old file was unusable: 73 rows, every artist the literal string
 * "Various Artists", every type "single", no artwork, and links that often
 * pointed at reuploads rather than SSK's own post.
 *
 * Hand corrections live in data/discography-overrides.json keyed by videoId
 * and ALWAYS win, so re-running this never clobbers your edits. That file is
 * also how the noise gets dropped (reaction videos, the affirmations series).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PLAYLIST_ID = 'PL60PtskKjky1r3e9iFacHX_laEZAxxE71'; // "Prod. by SSK"
const CHANNEL_ID  = 'UCTVT1JqREclqEvieKJ0T5ag';           // @SSKMusicBeats
const OUT         = path.join(ROOT, 'data/discography.json');
const OVERRIDES   = path.join(ROOT, 'data/discography-overrides.json');

/* ---------- key: env first, else the value already in the repo ---------- */
function getKey() {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY;
  const doc = path.join(ROOT, 'ENV_SETUP_DEPLOY.md');
  if (fs.existsSync(doc)) {
    const m = fs.readFileSync(doc, 'utf8').match(/AIza[A-Za-z0-9_-]{30,}/);
    if (m) return m[0];
  }
  throw new Error('No YOUTUBE_API_KEY (env or ENV_SETUP_DEPLOY.md)');
}
const KEY = getKey();

async function api(endpoint, params) {
  const qs = new URLSearchParams({ ...params, key: KEY });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${endpoint}?${qs}`);
  const json = await res.json();
  if (json.error) throw new Error(`${endpoint}: ${json.error.message}`);
  return json;
}

/** Walk every page of a playlist. */
async function playlistItems(playlistId) {
  const out = [];
  let pageToken = '';
  do {
    const d = await api('playlistItems', {
      part: 'snippet,contentDetails', maxResults: '50', playlistId, pageToken
    });
    out.push(...(d.items || []));
    pageToken = d.nextPageToken || '';
  } while (pageToken);
  return out;
}

/** Statistics come from a second call; batched 50 at a time. */
async function videoStats(ids) {
  const stats = {};
  for (let i = 0; i < ids.length; i += 50) {
    const d = await api('videos', {
      part: 'statistics,contentDetails', id: ids.slice(i, i + 50).join(',')
    });
    for (const v of d.items || []) {
      stats[v.id] = {
        views: Number(v.statistics?.viewCount || 0),
        duration: v.contentDetails?.duration || null
      };
    }
  }
  return stats;
}

/* ---------- classification ---------- */

const BEAT_RE = /type\s*beat|\(free\)|\[free\]|^free\b|instrumental|#typebeat/i;

// Things on the channel/playlist that aren't SSK releases at all.
const NOISE_RE = new RegExp([
  'reaction',
  'positive affirmations', 'gentle reminders', 'affirmations to',
  'studio x:', 'the making of',
  'makeup tutorial',                 // Colourpop upload
  'studio session', 'showcase',      // behind-the-scenes, not releases
  'live @', 'live at',
  'what are beat leases'             // explainer video
].join('|'), 'i');

// Behind-the-scenes / social posts that aren't releases. Deliberately
// narrow: remixes, mashups and singles ARE releases and must survive.
const BTS_RE = new RegExp([
  'testing ', 'how .{0,20}is made', 'comment fire',
  'tutorial', 'explained', 'out now\\b',
  '\\bvlog\\b', 'behind the scenes', 'day in the life'
].join('|'), 'i');

function classify(title) {
  if (NOISE_RE.test(title) || BTS_RE.test(title)) return 'noise';
  if (BEAT_RE.test(title)) return 'beat';
  return 'track';
}

/**
 * "B Young - Been Wavey (Prod. By SSK) [Music Video] | GRM Daily"
 *   -> { artist: "B Young", title: "Been Wavey" }
 */
function parseTrack(raw) {
  let s = raw
    .replace(/\s*\|\s*(GRM Daily|Link Up TV|Pressplay|MixtapeMadness|@?\w+)\s*$/i, '')
    .replace(/\[(official|music)[^\]]*\]/gi, '')
    .replace(/\((official|music)[^)]*\)/gi, '')
    .replace(/\(?\[?prod\.?\s*(by)?\s*ssk\]?\)?/gi, '')
    .replace(/@\S+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Allow "Artist- Title" as well as "Artist - Title": several real uploads
  // omit the leading space ("Odah Odah- I.L.Y My Shawty", "Rapture- Shamayné").
  // Still require whitespace *after* the dash so hyphenated names survive.
  const dash = s.match(/^(.+?)\s*[-–—]\s+(.+)$/);
  if (dash) {
    return {
      artist: dash[1].replace(/[\s\-–—]+$/, '').trim(),
      title: dash[2].replace(/[\s\-–—(\[]+$/, '').trim()
    };
  }
  return { artist: null, title: s };
}

/** '"Higher" - Burna Boy x Pharrell Type Beat | Afro-Fusion 2025' -> Higher */
// straight + curly quotes, by code point so the source stays unambiguous
const QUOTES = ['"', "'", '‘', '’', '“', '”'].join('');
const QUOTE_CLASS = `[${QUOTES}]`;

function parseBeat(raw) {
  const quoted = raw.match(new RegExp(`${QUOTE_CLASS}([^${QUOTES}]{2,60})${QUOTE_CLASS}`));

  let title;
  let unquotedArtist = null;

  if (quoted) {
    title = quoted[1];
  } else {
    // No quoted name. Drop the trailing "... Type Beat ..." descriptor, then
    // handle "Title - Artist" (e.g. "South of the Border - Sabrina Carpenter
    // Type Beat") by splitting on the LAST dash: left is the beat name,
    // right is who it's a type beat for.
    const head = raw.split(/[|–—]/)[0]
      .replace(/\(free\)|\[free\]/gi, '')
      .replace(/\s*type\s*beat.*$/i, '')
      .trim();
    const lastDash = head.lastIndexOf(' - ');
    if (lastDash > 0) {
      title = head.slice(0, lastDash).trim();
      unquotedArtist = head.slice(lastDash + 3).trim();
    } else {
      title = head;
    }
  }

  title = title
    .replace(/\(free\)|\[free\]/gi, '')
    .replace(new RegExp(QUOTE_CLASS, 'g'), '')   // strip stray smart quotes
    .replace(/\s{2,}/g, ' ')
    .trim();

  // hyphen + x must be allowed: "YG x G-Eazy Type Beat" was capturing "Eazy"
  const type = raw.match(/([A-Za-z0-9 .'&\-]+?)\s*type\s*beat/i);
  let typeBeatFor = type ? type[1].replace(new RegExp(QUOTE_CLASS, 'g'), '').trim() : null;
  // the quoted track name often sits immediately before "… Type Beat"
  if (typeBeatFor && quoted) {
    typeBeatFor = typeBeatFor.replace(new RegExp(`^${escapeRe(quoted[1])}\\s*[-–—]?\\s*`), '').trim();
  }
  if (typeBeatFor === '') typeBeatFor = null;
  // the dash-split above is more reliable than the regex for unquoted titles
  if (unquotedArtist) typeBeatFor = unquotedArtist;

  return { title: title || raw.slice(0, 60), typeBeatFor };
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function iso8601ToSeconds(d) {
  if (!d) return null;
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  return (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0));
}

/* ---------- build ---------- */

async function main() {
  const dry = process.argv.includes('--dry');

  console.log('Fetching "Prod. by SSK" playlist…');
  const trackItems = await playlistItems(PLAYLIST_ID);
  console.log(`  ${trackItems.length} items`);

  console.log('Fetching @SSKMusicBeats uploads…');
  const ch = await api('channels', { part: 'contentDetails', id: CHANNEL_ID });
  const uploadsId = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) throw new Error('could not resolve uploads playlist');
  const beatItems = await playlistItems(uploadsId);
  console.log(`  ${beatItems.length} items`);

  const overrides = fs.existsSync(OVERRIDES)
    ? JSON.parse(fs.readFileSync(OVERRIDES, 'utf8'))
    : {};

  const seen = new Set();
  const raw = [];
  for (const [src, items] of [['track', trackItems], ['beat', beatItems]]) {
    for (const it of items) {
      const id = it.contentDetails?.videoId;
      const sn = it.snippet || {};
      if (!id || seen.has(id)) continue;
      if (sn.title === 'Private video' || sn.title === 'Deleted video') continue;
      seen.add(id);
      raw.push({ id, title: sn.title, publishedAt: sn.publishedAt, defaultType: src });
    }
  }

  const stats = await videoStats(raw.map(r => r.id));

  const releases = [];
  const review = [];
  let dropped = 0;

  for (const r of raw) {
    const ov = overrides[r.id] || {};
    if (ov.exclude) { dropped++; continue; }

    let kind = ov.type || classify(r.title);
    if (kind === 'noise') { dropped++; review.push(['DROPPED', r.title]); continue; }

    // Channel uploads default to beat. Requiring a literal "type beat" match
    // was too strict — it binned real remixes and singles. Only genuine
    // behind-the-scenes / social chatter is dropped, via BTS_RE.
    if (!ov.type && r.defaultType === 'beat') kind = 'beat';

    let artist, title, typeBeatFor = null;
    if (kind === 'beat') {
      const p = parseBeat(r.title);
      title = ov.title || p.title;
      typeBeatFor = p.typeBeatFor;
      artist = ov.artist || 'SSK Music';
    } else {
      const p = parseTrack(r.title);
      title = ov.title || p.title;
      artist = ov.artist || p.artist;
      if (!artist) { artist = 'Unknown'; review.push(['NO ARTIST', r.title]); }
    }

    const st = stats[r.id] || {};
    releases.push({
      id: r.id,
      type: kind,                                   // "beat" | "track"
      title,
      artist,
      producer: 'SSK Music',
      typeBeatFor,
      year: new Date(r.publishedAt).getFullYear(),
      publishedAt: r.publishedAt,
      youtube_views: st.views || 0,
      duration_seconds: iso8601ToSeconds(st.duration),
      // maxres isn't generated for every upload; the page falls back to hq
      artwork: `https://i.ytimg.com/vi/${r.id}/maxresdefault.jpg`,
      artwork_fallback: `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg`,
      platforms: {
        youtube: `https://youtu.be/${r.id}`,
        ...(ov.platforms || {})
      },
      sourceTitle: r.title
    });
  }

  releases.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: { tracks: PLAYLIST_ID, beats: CHANNEL_ID },
    counts: {
      total: releases.length,
      beats: releases.filter(r => r.type === 'beat').length,
      tracks: releases.filter(r => r.type === 'track').length
    },
    releases
  };

  console.log(`\n  tracks : ${payload.counts.tracks}`);
  console.log(`  beats  : ${payload.counts.beats}`);
  console.log(`  total  : ${payload.counts.total}   (dropped ${dropped})`);

  if (review.length) {
    console.log(`\nNeeds a look (${review.length}) — fix via data/discography-overrides.json:`);
    for (const [why, t] of review.slice(0, 25)) {
      console.log(`  ${why.padEnd(10)} ${t.slice(0, 84)}`);
    }
    if (review.length > 25) console.log(`  …and ${review.length - 25} more`);
  }

  if (dry) { console.log('\n--dry: nothing written'); return; }

  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  if (!fs.existsSync(OVERRIDES)) {
    fs.writeFileSync(OVERRIDES, JSON.stringify({
      _README: 'Keyed by YouTube videoId. Any field here wins over the ' +
               'auto-parsed value. Use {"exclude":true} to drop a video. ' +
               'Re-running build-discography.mjs never overwrites this file.',
      _EXAMPLE_dQw4w9WgXcQ: {
        artist: 'Correct Artist', title: 'Correct Title',
        type: 'track', platforms: { spotify: 'https://…', beatstars: 'https://…' }
      }
    }, null, 2));
    console.log(`\ncreated ${path.relative(ROOT, OVERRIDES)}`);
  }
  console.log(`\nwrote ${path.relative(ROOT, OUT)}`);
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
