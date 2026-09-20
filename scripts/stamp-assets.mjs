#!/usr/bin/env node
/**
 * Stamp local css/js references with ?v=<git-sha> so deploys aren't masked
 * by the browser cache.
 *
 *   node scripts/stamp-assets.mjs        # stamp with current HEAD
 *   node scripts/stamp-assets.mjs --check # exit 1 if anything is unstamped
 *
 * Why this is needed: Cloudflare Pages serves HTML as
 *   cache-control: public, max-age=0, must-revalidate
 * but static assets as
 *   cache-control: public, max-age=14400
 * So for four hours after a deploy a returning visitor runs the NEW html
 * against the OLD javascript. That silently shipped a broken discography
 * page once already — the markup expected the library view while the cached
 * script still rendered the old flat grid.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = ['index.html', 'discography.html', 'contact.html'];

const sha = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  } catch {
    return String(Date.now()).slice(-7);
  }
})();

// local assets/… refs only; leave CDN and font URLs alone
const REF = /((?:href|src)=")(assets\/[^"?]+\.(?:css|js))(\?v=[^"]*)?(")/g;

let changed = 0;
const unstamped = [];

for (const page of PAGES) {
  const file = path.join(ROOT, page);
  if (!fs.existsSync(file)) continue;

  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(REF, (_m, pre, asset, _old, post) => {
    unstamped.push(`${page} -> ${asset}`);
    return `${pre}${asset}?v=${sha}${post}`;
  });

  if (after !== before) {
    if (!process.argv.includes('--check')) fs.writeFileSync(file, after);
    changed++;
    console.log(`  ${page}: stamped ${(after.match(/\?v=/g) || []).length} refs`);
  }
}

if (process.argv.includes('--check')) {
  if (unstamped.length) {
    console.error(`${unstamped.length} asset refs would change — run without --check`);
    process.exit(1);
  }
  console.log('all asset refs stamped');
} else {
  console.log(`\nstamped ${changed} file(s) with v=${sha}`);
}
