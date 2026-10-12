/**
 * Pick a Pexels stock image for a blog post.
 *
 * The first version took result #1 for "<tag> <tag> music studio", so the
 * generic "music studio" dominated every search and unrelated posts got the
 * same photo. Now: pull candidates from a few searches built from the post
 * itself, drop any photo another post already uses, and score the rest by how
 * well Pexels' own alt-text description matches the article's words.
 *
 * Best-effort: a missing key, network failure, or empty result returns null
 * and the post simply goes without an image -- never breaks the build.
 */

const STOP = new Set(`a an and are as at be but by for from has have how i if in into is it its
it's not of on or so than that the their them then there these they this to too up was what
when where which who why will with without you your yours our we us can do does don't doesn't
just more most one two three nine actually real really own get gets got make makes made
vs versus about after before over under between every any all some only even still also very
much many what's isn't aren't won't`.split(/\s+/));

// Keeps a picked photo on-brand: a candidate showing music gear/people beats
// an equally keyword-matched one that doesn't.
const MUSIC = new Set(['music', 'musician', 'studio', 'recording', 'microphone', 'mic', 'headphones',
  'mixer', 'mixing', 'console', 'synthesizer', 'synth', 'keyboard', 'piano', 'guitar', 'bass',
  'drum', 'drums', 'producer', 'dj', 'turntable', 'vinyl', 'record', 'speaker', 'speakers',
  'concert', 'singer', 'rapper', 'stage', 'audio', 'sound', 'beat', 'beats', 'laptop', 'controller']);

function words(text) {
  return String(text || '').toLowerCase()
    .replace(/[’']/g, "'")
    .split(/[^a-z0-9']+/)
    .map((w) => w.replace(/'s$/, '').replace(/^'+|'+$/g, ''))
    .filter((w) => w.length > 2 && !STOP.has(w));
}

// Crude stem so "producers"/"producer", "drums"/"drum" match.
const stem = (w) => w.replace(/(ies|es|s)$/, (m) => (m === 'ies' ? 'y' : ''));

export function photoId(url) {
  const m = String(url || '').match(/\/photos\/(\d+)\//);
  return m ? m[1] : null;
}

async function search(query, key) {
  try {
    const res = await fetch(
      'https://api.pexels.com/v1/search?per_page=15&orientation=landscape&query=' + encodeURIComponent(query),
      { headers: { Authorization: key } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.photos || [];
  } catch (e) {
    console.warn('  Pexels fetch failed for "' + query + '":', e.message);
    return [];
  }
}

/**
 * @param post     {title, tags, excerpt, content}
 * @param usedIds  Set of Pexels photo ids already used by other posts
 * @returns        {url, id, alt, query} or null
 */
export async function pickPostImage(post, usedIds = new Set()) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  // Weighted article vocabulary: title and tags say what the post is about,
  // the excerpt and body add supporting detail.
  const weight = new Map();
  const add = (text, w) => words(text).forEach((t) => {
    const s = stem(t);
    weight.set(s, Math.max(weight.get(s) || 0, w));
  });
  add(String(post.content || '').slice(0, 3000), 1);
  add(post.excerpt, 2);
  add((post.tags || []).join(' '), 3);
  add(post.title, 3);

  const tags = post.tags || [];
  const titleWords = words(post.title).slice(0, 4).join(' ');
  const queries = [
    titleWords && titleWords + ' music',
    tags.slice(0, 2).join(' '),
    tags[0] && tags[0] + ' music',
    'music producer studio',
  ].filter(Boolean);

  const seen = new Set();
  let best = null;
  for (let qi = 0; qi < queries.length; qi++) {
    const photos = await search(queries[qi], key);
    photos.forEach((ph, rank) => {
      const id = String(ph.id);
      if (seen.has(id) || usedIds.has(id)) return;
      seen.add(id);
      const altStems = new Set(words(ph.alt).map(stem));
      let score = 0;
      altStems.forEach((s) => { score += weight.get(s) || 0; });
      if ([...altStems].some((s) => MUSIC.has(s) || MUSIC.has(s + 's'))) score += 2;
      // Small tie-breaker for earlier, more specific queries and higher ranks.
      score += (queries.length - qi) * 0.3 + (15 - rank) * 0.02;
      if (!best || score > best.score) {
        best = { url: ph.src.landscape, id, alt: ph.alt || '', query: queries[qi], score };
      }
    });
  }
  return best;
}
