#!/usr/bin/env node
/**
 * Topic rotation + repeat-guard for the SSK Music blog.
 *
 *   node scripts/blog-topic-guard.mjs --pick        one unused topic
 *   node scripts/blog-topic-guard.mjs --forbidden   what not to write
 *   node scripts/blog-topic-guard.mjs               status
 *
 * Modelled on the BigHeadz guard, which is the thing that stops 100+ posts
 * collapsing into the same article. Two mechanisms:
 *
 *   TOPICS    a seeded list, each used once before any repeats. Rotation
 *             state lives in data/blog/topic-rotation.json.
 *   CLUSTERS  regexes matched against titles already published. If a cluster
 *             is already covered, the angle is off the table — this catches
 *             the agent rewording its way back to a topic it has done.
 *
 * SSK's failure mode is different from a hat store's. The risk here is
 * genre-tourism — every post becoming "here's how to make an X beat" — so the
 * list is deliberately weighted toward things only this catalogue can say:
 * records that exist, sessions that happened, tools on this site.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'data', 'blog', 'posts');
const ROTATION = join(ROOT, 'data', 'blog', 'topic-rotation.json');

/* ---------------- .env (CONTENT_IDEAS_SECRET) ---------------- */
const ENV_PATH = join(ROOT, '.env');
if (existsSync(ENV_PATH) && !process.env.CONTENT_IDEAS_SECRET) {
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

/* ---------------- manually-submitted content ideas ---------------- */
// The ?page=ideas form on the Apps Script side (SSK Email List Lead hook)
// writes into a "Content Ideas" sheet tab. Checked first, oldest first --
// a human dropping in a specific topic should always win over the seeded
// rotation below. Best-effort: any failure here (no secret configured, the
// endpoint being unreachable) just falls through to the seeded list rather
// than blocking the whole pipeline.
const IDEAS_URL = 'https://script.google.com/macros/s/AKfycbwUkrwN7XoEDxp99czeb2JMekYfkET0GcTgLv_fcAIFzC6_NJSXm-9Zj64KW5tHsvfK3A/exec';

async function fetchPendingIdea() {
  const secret = process.env.CONTENT_IDEAS_SECRET;
  if (!secret) return null;
  try {
    const res = await fetch(`${IDEAS_URL}?action=contentIdeas&secret=${encodeURIComponent(secret)}`);
    if (!res.ok) return null;
    const ideas = await res.json();
    if (!Array.isArray(ideas) || !ideas.length) return null;
    return ideas.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[0];
  } catch (e) {
    console.warn('  Content-ideas fetch failed:', e.message);
    return null;
  }
}

async function markIdeaUsed(row) {
  const secret = process.env.CONTENT_IDEAS_SECRET;
  if (!secret) return;
  try {
    await fetch(IDEAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'markIdeaUsed', row, secret }),
    });
  } catch (e) {
    console.warn('  Failed to mark idea used:', e.message);
  }
}

const TOPICS = [
  // --- catalogue & history: things only SSK can write ---
  { id: 'been-wavey-anatomy', cat: 'catalogue', t: 'Anatomy of "Been Wavey": what the arrangement does in the first 30 seconds and why it broke' },
  { id: 'afroswing-2017', cat: 'history', t: 'What London sounded like in 2017: the year Afroswing stopped being a scene and became the chart' },
  { id: 'afroswing-vs-afrobeats', cat: 'history', t: 'Afroswing vs Afrobeats vs Afrobeat: three different things people use interchangeably' },
  { id: 'uk-drill-lineage', cat: 'history', t: 'How UK drill inherited its hi-hats from grime, not Chicago' },
  { id: 'producer-tag-history', cat: 'history', t: 'Why producer tags exist, and what a good one actually does for a record' },

  // --- production technique, tied to the Fun Lab ---
  { id: 'log-drum-build', cat: 'technique', t: 'Building an amapiano log drum from a sine wave: pitch envelope, decay, and why presets sound generic' },
  { id: 'swing-explained', cat: 'technique', t: 'Swing percentages explained: what 54% actually does to a hi-hat pattern' },
  { id: 'tresillo', cat: 'technique', t: 'The 3+3+2: one rhythm under Afrobeats, dancehall, reggaeton and half the charts' },
  { id: 'sample-clearance', cat: 'business', t: 'Sampling: what clears, what does not, and what it costs when you get it wrong' },
  { id: 'drums-that-sit', cat: 'technique', t: 'Why your drums sound thin next to a released record, and the three fixes that matter' },
  { id: 'stem-discipline', cat: 'technique', t: 'Stem bleed: why one-shots sliced from your own sessions retrigger badly in a sequencer' },
  { id: 'one-drop-family', cat: 'technique', t: 'One drop, steppers, rockers: the three dancehall kick families and when each is right' },

  // --- the business side ---
  { id: 'sync-licensing-101', cat: 'business', t: 'How a beat ends up in a Netflix scene: the sync licensing chain, start to finish' },
  { id: 'splits-paperwork', cat: 'business', t: 'Producer splits: the conversation to have before the session, not after' },
  { id: 'type-beat-economics', cat: 'business', t: 'The real economics of type beats: what 289 uploads actually returns' },
  { id: 'publishing-basics', cat: 'business', t: 'Publishing vs masters, explained without the jargon' },
  { id: 'working-with-labels', cat: 'business', t: 'What changes when a major label is on the other side of the record' },

  // --- craft & studio ---
  { id: 'vocal-pocket', cat: 'technique', t: 'Leaving room for the vocal: why the best beats sound empty on their own' },
  { id: 'reference-mixing', cat: 'technique', t: 'Mixing against a reference without copying it' },
  { id: 'finishing-beats', cat: 'craft', t: 'Why producers have 400 unfinished projects, and the rule that fixes it' },
  { id: 'session-etiquette', cat: 'craft', t: 'Studio etiquette: how to run a session an artist wants to come back to' },
  { id: 'hooks-in-beats', cat: 'technique', t: 'Writing a hook into the beat so the artist finds the melody for you' },

  // --- tools on this site ---
  { id: 'funlab-tour', cat: 'tools', t: 'A tour of the Fun Lab: stem player, beat machine, cheat sheet and rhyme finder' },
  { id: 'cheat-sheet-genres', cat: 'tools', t: 'Twelve grooves, one grid: reading the drum pattern cheat sheet' },
];

const CLUSTERS = [
  { id: 'generic-how-to-beat', re: /\bhow to (make|produce) a beat\b/i, ban: 'Generic "how to make a beat" — every producer blog has one' },
  { id: 'plugin-listicle', re: /\b(top|best)\s*\d*\s*(plugins?|vsts?|daws?)\b/i, ban: 'Plugin/DAW listicles — not what this catalogue is for' },
  { id: 'beginner-daw', re: /\b(fl studio|ableton|logic pro)\b.*\b(beginner|tutorial|guide)\b/i, ban: 'DAW beginner tutorials — wrong audience' },
  { id: 'ai-music-hype', re: /\bai\b.*\b(replace|kill|end of).*(producer|music)\b/i, ban: 'AI-will-replace-producers takes' },
  { id: 'motivation', re: /\b(hustle|grind|mindset|manifest)\b/i, ban: 'Motivational filler — show the work instead' },
];

/* ---------- state ---------- */

const titles = existsSync(POSTS)
  ? readdirSync(POSTS).filter((f) => f.endsWith('.json')).map((f) => {
      try { return JSON.parse(readFileSync(join(POSTS, f), 'utf8')).title || ''; }
      catch { return ''; }
    })
  : [];

const rotation = existsSync(ROTATION)
  ? JSON.parse(readFileSync(ROTATION, 'utf8'))
  : { usedTopicIds: [], lastCategory: null };

const used = new Set(rotation.usedTopicIds || []);

function pick() {
  let pool = TOPICS.filter((t) => !used.has(t.id));
  // Every topic used once before anything repeats.
  if (!pool.length) {
    rotation.usedTopicIds = [];
    used.clear();
    pool = TOPICS.slice();
  }
  // Avoid two posts from the same category back to back.
  const varied = pool.filter((t) => t.cat !== rotation.lastCategory);
  const from = varied.length ? varied : pool;
  const chosen = from[Math.floor(Math.random() * from.length)];

  rotation.usedTopicIds = [...used, chosen.id];
  rotation.lastCategory = chosen.cat;
  mkdirSync(dirname(ROTATION), { recursive: true });
  writeFileSync(ROTATION, JSON.stringify(rotation, null, 2));
  return chosen;
}

const arg = process.argv[2];

if (arg === '--pick') {
  const idea = await fetchPendingIdea();
  if (idea) {
    await markIdeaUsed(idea.row);
    console.log(idea.idea);
  } else {
    console.log(pick().t);
  }
} else if (arg === '--forbidden') {
  const covered = CLUSTERS.filter((c) => titles.some((t) => c.re.test(t)));
  console.log(JSON.stringify({
    neverWrite: CLUSTERS.map((c) => c.ban),
    alreadyCovered: covered.map((c) => c.id),
    existingTitles: titles,
    titleRules: [
      'No clickbait numerals unless the post genuinely is a list',
      'Name the specific record, rhythm or contract term in the title where you can',
      'Do not open two consecutive posts with the same word',
      'British spelling',
    ],
  }, null, 2));
} else {
  console.log(`posts: ${titles.length}`);
  console.log(`topics used: ${used.size}/${TOPICS.length}`);
  console.log(`last category: ${rotation.lastCategory ?? '(none)'}`);
  console.log(`remaining: ${TOPICS.filter((t) => !used.has(t.id)).length}`);
}
