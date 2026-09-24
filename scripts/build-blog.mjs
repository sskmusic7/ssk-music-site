#!/usr/bin/env node
/**
 * Build the SSK Music blog.
 *
 *   node scripts/build-blog.mjs
 *
 * Reads data/blog/posts/<slug>.json and writes:
 *   blog/<slug>.html     a real, separately indexable page per post
 *   data/blog/index.json the listing feed (newest first)
 *
 * Static pages rather than one client-rendered view: the whole point of the
 * blog is to be found, and a page that only exists after JS runs is a page
 * search engines may or may not index. Each post gets its own URL, its own
 * description and OG tags, and a BlogPosting JSON-LD block.
 *
 * Markdown is rendered here, at build time, so the published pages carry no
 * client-side parser. Input is escaped before any formatting is applied —
 * posts are written by an agent, and agent output is untrusted input like
 * any other.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = join(ROOT, 'data', 'blog', 'posts');
const OUT_DIR = join(ROOT, 'blog');
const SITE = 'https://sskmusic.com';

/* ---------------- .env (PEXELS_API_KEY) ---------------- */
// No npm dependencies in this script by design -- a few lines beats adding dotenv.
const ENV_PATH = join(ROOT, '.env');
if (existsSync(ENV_PATH) && !process.env.PEXELS_API_KEY) {
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

/* ---------------- Pexels ---------------- */
// Best-effort: a missing key, network failure, or empty result must never
// break the build -- it just leaves that post without a stock image.
async function fetchPexelsImage(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !query) return null;
  try {
    const res = await fetch(
      'https://api.pexels.com/v1/search?per_page=1&orientation=landscape&query=' + encodeURIComponent(query),
      { headers: { Authorization: key } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.photos && data.photos[0] ? data.photos[0].src.landscape : null;
  } catch (e) {
    console.warn('  Pexels fetch failed for "' + query + '":', e.message);
    return null;
  }
}

/* ---------------- markdown ---------------- */

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Inline formatting, applied to already-escaped text. */
function inline(s) {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    // Only http(s) and site-relative links — no javascript: or data: URLs.
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g,
             '<a href="$2" rel="noopener">$1</a>');
}

function markdown(src) {
  const lines = esc(src || '').split(/\r?\n/);
  const out = [];
  let para = [], list = null, quote = [];

  const flushPara = () => {
    if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; }
  };
  const flushList = () => {
    if (list) { out.push(`<${list.tag}>${list.items.join('')}</${list.tag}>`); list = null; }
  };
  const flushQuote = () => {
    if (quote.length) {
      out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
      quote = [];
    }
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) { flushAll(); continue; }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      flushAll();
      // Posts never own <h1> — the page title is the h1, so body headings
      // start at h2. Clamping rather than offsetting matters: offsetting by
      // one sent "##" (what posts actually use for sections) to <h3>, leaving
      // the document going h1 -> h3 with no h2, which is a skipped heading
      // level. So "#" and "##" both land on h2, and deeper levels nest.
      const level = Math.min(4, Math.max(2, h[1].length));
      out.push(`<h${level}>${inline(h[2].trim())}</h${level}>`);
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara(); flushQuote();
      const tag = ul ? 'ul' : 'ol';
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push(`<li>${inline((ul || ol)[1].trim())}</li>`);
      continue;
    }

    const bq = line.match(/^>\s?(.*)$/);
    if (bq) { flushPara(); flushList(); quote.push(bq[1].trim()); continue; }

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) { flushAll(); out.push('<hr>'); continue; }

    flushList(); flushQuote();
    para.push(line.trim());
  }
  flushAll();
  return out.join('\n');
}

/* ---------------- helpers ---------------- */

const readingTime = (text) =>
  Math.max(1, Math.round(String(text || '').split(/\s+/).filter(Boolean).length / 200));

const fmtDate = (d) => {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const NAV = (prefix) => `
    <header class="sticky-header">
        <div class="sticky-header-content">
            <div class="sticky-logo">
                <a href="${prefix}index.html"><img src="${prefix}assets/images/SSK Logo.png" alt="SSK Music"></a>
            </div>
            <div class="sticky-cta">
                <a href="${prefix}index.html" class="sticky-nav-link bypass-touch-check">Home</a>
                <a href="${prefix}index.html#services" class="sticky-nav-link bypass-touch-check">Services</a>
                <a href="${prefix}discography.html" class="sticky-nav-link bypass-touch-check">Discography</a>
                <a href="${prefix}funlab.html" class="sticky-nav-link bypass-touch-check">Fun Lab</a>
                <a href="${prefix}blog.html" class="sticky-nav-link bypass-touch-check BLOGACTIVE">Blog</a>
                <a href="${prefix}contact.html" class="sticky-nav-link bypass-touch-check">Contact</a>
            </div>
        </div>
    </header>`;

const HEAD = ({ title, desc, prefix, canonical, extra = '' }) => `<!DOCTYPE html>
<html lang="en">
<head>
    <title>${esc(title)}</title>
    <meta charset="UTF-8">
    <meta name="description" content="${esc(desc)}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="canonical" href="${canonical}">

    <meta property="og:type" content="article">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${canonical}">
    <meta name="twitter:card" content="summary_large_image">

    <link rel="icon" type="image/png" sizes="32x32" href="${prefix}assets/images/favicon-32x32.png">
    <link rel="icon" href="${prefix}favicon.ico">

    <link rel="stylesheet" href="${prefix}assets/css/bootstrap-grid.min.css"/>
    <link rel="stylesheet" href="${prefix}assets/css/plugins.css"/>
    <link rel="stylesheet" href="${prefix}assets/css/main.css"/>
    <link rel="stylesheet" href="${prefix}assets/css/blog.css"/>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
    <link rel="stylesheet" href="${prefix}assets/icon-fonts/remixicon/remixicon.css"/>
${extra}
    <link rel="stylesheet" href="${prefix}assets/css/responsive-fixes.css"/>
</head>`;

/* ---------------- build ---------------- */

if (!existsSync(POSTS_DIR)) mkdirSync(POSTS_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const posts = readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const p = JSON.parse(readFileSync(join(POSTS_DIR, f), 'utf8'));
    p.slug = p.slug || f.replace(/\.json$/, '');
    return p;
  })
  .filter((p) => p.published !== false)
  .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

/* Fetch a stock image for any post that doesn't already have one, once, and
   cache it into the post's own source file -- never re-fetched, never
   overwrites an image someone set by hand. */
for (const p of posts) {
  if (p.image) continue;
  const query = [...(p.tags || []).slice(0, 2), 'music studio'].join(' ');
  const image = await fetchPexelsImage(query);
  if (image) {
    p.image = image;
    const postFile = join(POSTS_DIR, `${p.slug}.json`);
    if (existsSync(postFile)) {
      const raw = JSON.parse(readFileSync(postFile, 'utf8'));
      raw.image = image;
      writeFileSync(postFile, JSON.stringify(raw, null, 2) + '\n');
    }
  }
}

for (const p of posts) {
  const canonical = `${SITE}/blog/${p.slug}`;
  const desc = p.excerpt || String(p.content || '').slice(0, 155);
  const body = markdown(p.content);
  const mins = readingTime(p.content);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: desc,
    datePublished: p.date,
    author: { '@type': 'Organization', name: p.author || 'SSK Music' },
    publisher: { '@id': `${SITE}/#ssk-music` },
    mainEntityOfPage: canonical,
    keywords: (p.tags || []).join(', '),
  };
  if (p.image) ld.image = p.image.startsWith('http') ? p.image : `${SITE}/${p.image.replace(/^\//, '')}`;

  const extra = `    <script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n    </script>\n`;

  const html = `${HEAD({ title: `${p.title} | SSK Music`, desc, prefix: '../', canonical, extra })}
<body>
${NAV('../').replace(' BLOGACTIVE', ' active')}

    <main class="blog-post">
        <article class="container">
            <nav class="blog-crumb"><a href="../blog.html">← All posts</a></nav>

            <header class="blog-post-head">
                <p class="blog-meta">
                    <time datetime="${esc(p.date)}">${esc(fmtDate(p.date))}</time>
                    <span aria-hidden="true">·</span> ${mins} min read
                </p>
                <h1>${esc(p.title)}</h1>
                ${p.excerpt ? `<p class="blog-standfirst">${esc(p.excerpt)}</p>` : ''}
                ${(p.tags || []).length
                  ? `<ul class="blog-tags">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
                  : ''}
            </header>

            ${p.image ? `<img class="blog-hero" src="${esc(p.image.startsWith('http') ? p.image : '../' + p.image.replace(/^\//, ''))}" alt="" loading="lazy">` : ''}

            <div class="blog-body">
${body}
            </div>

            <footer class="blog-post-foot">
                <p>Written by ${esc(p.author || 'SSK Music')}.</p>
                <a class="blog-cta" href="../contact.html">Work with SSK Music →</a>
            </footer>
        </article>
    </main>

    <script src="../assets/js/main.js"></script>
</body>
</html>
`;
  writeFileSync(join(OUT_DIR, `${p.slug}.html`), html);
}

/* listing feed — also what the generator agent reads to avoid repeating itself */
const index = posts.map((p) => ({
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt || '',
  date: p.date,
  tags: p.tags || [],
  image: p.image || null,
  readingMinutes: readingTime(p.content),
  url: `blog/${p.slug}.html`,
}));

mkdirSync(join(ROOT, 'data', 'blog'), { recursive: true });
writeFileSync(join(ROOT, 'data', 'blog', 'index.json'),
              JSON.stringify({ count: index.length, posts: index }, null, 2));

/* listing page — generated rather than fetched, so the index is in the HTML */
const cards = index.length
  ? index.map((p) => `
                <article class="blog-card">
                    <a class="blog-card-link" href="${p.url}">
                        ${p.image ? `<img class="blog-card-image" src="${esc(p.image)}" alt="" loading="lazy">` : ''}
                        <p class="blog-meta">
                            <time datetime="${esc(p.date)}">${esc(fmtDate(p.date))}</time>
                            <span aria-hidden="true">·</span> ${p.readingMinutes} min read
                        </p>
                        <h2>${esc(p.title)}</h2>
                        ${p.excerpt ? `<p class="blog-card-excerpt">${esc(p.excerpt)}</p>` : ''}
                        ${p.tags.length
                          ? `<ul class="blog-tags">${p.tags.slice(0, 3).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
                          : ''}
                        <span class="blog-card-more">Read →</span>
                    </a>
                </article>`).join('')
  : `
                <p class="blog-empty">First posts are on their way. Check back shortly.</p>`;

const listingLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'The SSK Music Blog',
  url: `${SITE}/blog`,
  publisher: { '@id': `${SITE}/#ssk-music` },
  blogPost: index.slice(0, 20).map((p) => ({
    '@type': 'BlogPosting',
    headline: p.title,
    datePublished: p.date,
    url: `${SITE}/${p.url.replace(/\.html$/, '')}`,
  })),
};

const listing = `${HEAD({
  title: 'Blog | SSK Music',
  desc: 'Production notes, Afroswing history, sync licensing and the making of records from the SSK Music catalogue.',
  prefix: '',
  canonical: `${SITE}/blog`,
  extra: `    <script type="application/ld+json">\n${JSON.stringify(listingLd, null, 2)}\n    </script>\n`,
})}
<body>
${NAV('').replace(' BLOGACTIVE', ' active')}

    <main class="blog-index">
        <div class="container">
            <header class="blog-index-head">
                <h1>The SSK Music Blog</h1>
                <p>Production notes, Afroswing history, sync licensing, and how the records in the catalogue actually got made.</p>
            </header>

            <div class="blog-grid">${cards}
            </div>
        </div>
    </main>

    <script src="assets/js/main.js"></script>
</body>
</html>
`;
writeFileSync(join(ROOT, 'blog.html'), listing);

console.log(`  ${posts.length} post(s) -> blog/*.html + data/blog/index.json`);
for (const p of index) console.log(`    ${p.date}  ${p.slug}`);
