#!/usr/bin/env node
/**
 * Mechanical check for AI-sounding prose in a blog post.
 *
 *   node scripts/blog-voice-lint.mjs <slug>       lint one post
 *   node scripts/blog-voice-lint.mjs --all        lint everything in posts/
 *
 * Exits non-zero on any FAIL. blog-publish.sh runs this before publishing and
 * refuses to push if it fails.
 *
 * Why this exists: BigHeadz's blog skill and pipeline both reference
 * scripts/audit-blog-copy.ts as a tone QC gate. That file does not exist and
 * never has — `git log --all` on it returns nothing. The pipeline calls it,
 * it fails, the script catches the failure and logs a warning, and the run
 * continues. So BigHeadz has published roughly a hundred posts with a QC step
 * that has been a no-op since day one. Whatever "sounds like AI" is on that
 * blog, nothing has ever been checking for it. This is a real gate: it runs,
 * and a FAIL blocks the push.
 *
 * The rules below aren't house style opinion — they're the patterns that
 * come up again and again across sources on why AI writing reads as AI
 * writing: the em dash as the single most-cited tell, the "it's not X, it's
 * Y" contrastive construction, a fixed set of words LLMs reach for
 * disproportionately (delve, tapestry, realm, leverage...), and stock
 * openers ("In today's fast-paced world..."). Checked against the site's own
 * seed post before this script existed: 11 em dashes in ~800 words, one
 * "That's not a stylistic flourish. It's inherited." construction, and a
 * rule-of-three list in the opening paragraph. That post is what this
 * script would have caught.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = join(ROOT, 'data', 'blog', 'posts');

// Words an LLM reaches for far more than a person drafting off the cuff.
// Not banned because they're wrong — banned because five of them in one
// post is a stronger tell than any single one.
const TELL_WORDS = [
  'delve', 'tapestry', 'realm', 'leverage', 'elevate', 'foster', 'navigate',
  'unleash', 'unlock', 'embark', 'testament', 'robust', 'seamless',
  'underscore', 'multifaceted', 'holistic', 'paradigm', 'synergy',
  'game-changer', 'game changing', 'cutting-edge', 'boundaries',
  'ever-evolving', 'landscape', 'realm of possibilities',
];

const STOCK_OPENERS = [
  /^in today'?s\b/i,
  /^in the (ever-?evolving|fast-paced|world of)\b/i,
  /^when it comes to\b/i,
  /^it'?s no secret that\b/i,
  /^as we navigate\b/i,
];

const STOCK_PHRASES = [
  { re: /\bbut here'?s the thing\b/i, label: '"but here\'s the thing"' },
  { re: /\bat the end of the day\b/i, label: '"at the end of the day"' },
  { re: /\bin conclusion\b/i, label: '"in conclusion"' },
  { re: /\bit'?s worth noting that\b/i, label: '"it\'s worth noting that"' },
  { re: /\bplays a (crucial|vital|key) role\b/i, label: 'plays a [crucial/vital/key] role' },
];

// "That's not X. It's Y." / "It isn't just X, it's Y." — the contrastive
// negation-then-reveal pattern that shows up constantly in LLM output and
// almost never in a person just telling you something.
const NOT_X_ITS_Y = [
  /\b(that'?s|it'?s|this isn'?t)\s+not\b[^.!?]*[.!?]\s*(it'?s|that'?s)\b/i,
  /\bisn'?t just\b[^.!?]*,\s*it'?s\b/i,
  /\bnot (just|only)\b[^.!?]*[—-]\s*it'?s\b/i,
];

const EM_DASH_MAX = 1;

function ruleOfThreeCount(text) {
  // ", X, Y, or/and Z" inside a single sentence — the reflexive three-item
  // list. One or two in a long post is normal prose; more than that is a
  // tic.
  const matches = text.match(/,\s*[a-z][^,.;:!?]{2,30},\s*(?:or|and)\s+[a-z][^,.;:!?]{2,30}[.!?]/gi);
  return matches ? matches.length : 0;
}

function lint(post) {
  const findings = [];
  const text = String(post.content || '');
  const title = String(post.title || '');
  const excerpt = String(post.excerpt || '');
  const all = `${title}\n${excerpt}\n${text}`;

  const emDashes = (text.match(/—/g) || []).length;
  if (emDashes > EM_DASH_MAX) {
    findings.push({
      level: 'FAIL',
      msg: `${emDashes} em dashes (max ${EM_DASH_MAX}). Split into two sentences, or use a comma/colon.`,
    });
  }

  const words = TELL_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(all));
  if (words.length) {
    findings.push({ level: 'FAIL', msg: `tell-words used: ${words.join(', ')}` });
  }

  for (const re of STOCK_OPENERS) {
    if (re.test(text.trim())) {
      findings.push({ level: 'FAIL', msg: `stock opener matches ${re}` });
    }
  }

  for (const { re, label } of STOCK_PHRASES) {
    if (re.test(all)) findings.push({ level: 'FAIL', msg: `stock phrase: ${label}` });
  }

  for (const re of NOT_X_ITS_Y) {
    const m = text.match(re);
    if (m) findings.push({ level: 'FAIL', msg: `"not X, it's Y" construction: "${m[0].slice(0, 70)}..."` });
  }

  const r3 = ruleOfThreeCount(text);
  if (r3 > 2) {
    findings.push({ level: 'WARN', msg: `${r3} rule-of-three list sentences — check they're not padding` });
  }

  // A post that's all short punchy fragments is its own tell in the other
  // direction. Soft warning only.
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 3);
  const avgWords = sentences.length
    ? sentences.reduce((n, s) => n + s.split(/\s+/).length, 0) / sentences.length
    : 0;
  if (avgWords > 0 && avgWords < 9) {
    findings.push({ level: 'WARN', msg: `avg sentence length ${avgWords.toFixed(1)} words — very choppy` });
  }

  return findings;
}

function loadPost(slug) {
  return JSON.parse(readFileSync(join(POSTS_DIR, `${slug}.json`), 'utf8'));
}

const arg = process.argv[2];
const slugs = arg === '--all'
  ? readdirSync(POSTS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
  : arg ? [arg] : [];

if (!slugs.length) {
  console.error('Usage: node scripts/blog-voice-lint.mjs <slug> | --all');
  process.exit(2);
}

let hasFail = false;
for (const slug of slugs) {
  let post;
  try { post = loadPost(slug); }
  catch (e) { console.error(`${slug}: could not read post (${e.message})`); hasFail = true; continue; }

  const findings = lint(post);
  const fails = findings.filter((f) => f.level === 'FAIL');
  if (fails.length) hasFail = true;

  console.log(`\n${slug} — ${fails.length ? 'FAIL' : 'ok'}`);
  for (const f of findings) console.log(`  [${f.level}] ${f.msg}`);
  if (!findings.length) console.log('  clean');
}

process.exit(hasFail ? 1 : 0);
