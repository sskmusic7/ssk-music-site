/**
 * SSK MUSIC DISCOGRAPHY — library view
 *
 * 360 releases rendered as one flat grid was unreadable, so this groups them:
 *   Tracks / Beats  ->  year shelves  ->  horizontal rail of cards
 *
 * Shelves collapse, so the page is short and everything is one click away.
 * Searching flattens the view and auto-expands whatever matched.
 */

let discographyData = null;
let currentFilter = 'all';     // 'all' | 'track' | 'beat'
let searchQuery = '';
const openShelves = new Set(); // "track:2021"

/* ---------------- helpers ---------------- */

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatViews(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
}

function subtitleFor(item) {
    if (item.type === 'beat') {
        return item.typeBeatFor ? item.typeBeatFor + ' type beat' : 'Type beat';
    }
    return item.artist || 'Unknown';
}

/* ---------------- filtering ---------------- */

function filterItems(items) {
    const q = searchQuery.toLowerCase();

    return items.filter(item => {
        // This used to ignore currentFilter entirely, which is why the
        // filter buttons did nothing.
        if (currentFilter !== 'all' && item.type !== currentFilter) return false;
        if (!q) return true;

        return [item.title, item.artist, item.producer, item.typeBeatFor, String(item.year)]
            .some(v => v && String(v).toLowerCase().includes(q));
    });
}

/* ---------------- rendering ---------------- */

function cardHTML(item) {
    const art = item.artwork || '';
    const fallback = item.artwork_fallback || 'assets/images/album-1.jpg';
    const href = (item.platforms && item.platforms.youtube) || '#';

    return `
        <a class="lib-card" href="${escapeHtml(href)}" target="_blank" rel="noopener">
            <div class="lib-card-art">
                <img src="${escapeHtml(art)}" alt="${escapeHtml(item.title)}" loading="lazy"
                     onerror="this.onerror=null;this.src='${escapeHtml(fallback)}';">
                <span class="lib-card-type">${item.type === 'beat' ? 'Beat' : 'Track'}</span>
            </div>
            <div class="lib-card-body">
                <h4 class="lib-card-title">${escapeHtml(item.title)}</h4>
                <div class="lib-card-sub">${escapeHtml(subtitleFor(item))}</div>
                <div class="lib-card-meta">
                    <i class="ri-youtube-fill"></i>
                    <span>${formatViews(item.youtube_views)}</span>
                    <span>&middot; ${item.year}</span>
                </div>
            </div>
        </a>`;
}

function shelfHTML(type, year, items, forceOpen) {
    const key = type + ':' + year;
    const open = forceOpen || openShelves.has(key);

    return `
        <div class="lib-shelf${open ? ' is-open' : ''}" data-shelf="${key}">
            <button class="lib-shelf-head" type="button" data-toggle="${key}"
                    aria-expanded="${open}">
                <span class="lib-chevron">&#9654;</span>
                <span class="lib-year">${year}</span>
                <span class="lib-shelf-count">${items.length} ${items.length === 1 ? 'release' : 'releases'}</span>
                <span class="lib-viewall" data-grid="${key}" role="button">Grid</span>
            </button>
            <div class="lib-shelf-body">
                <div class="lib-rail">${items.map(cardHTML).join('')}</div>
            </div>
        </div>`;
}

function groupHTML(label, type, items, forceOpen) {
    if (!items.length) return '';

    // newest year first
    const byYear = {};
    for (const it of items) (byYear[it.year] = byYear[it.year] || []).push(it);
    const years = Object.keys(byYear).sort((a, b) => b - a);

    // open the newest shelf by default so the section is never blank
    const shelves = years.map((y, i) =>
        shelfHTML(type, y, byYear[y], forceOpen || i === 0)).join('');

    return `
        <section class="lib-group">
            <div class="lib-group-head">
                <h3 class="lib-group-title">${label}</h3>
                <span class="lib-group-count">${items.length} total &middot; ${years.length} years</span>
            </div>
            ${shelves}
        </section>`;
}

function render() {
    const root = document.getElementById('releases-content');
    const loading = document.getElementById('releasesLoading');
    if (!discographyData) return;
    if (loading) loading.style.display = 'none';

    const all = filterItems(discographyData.releases || []);
    const searching = !!searchQuery;

    const subtitle = document.querySelector('#releases-section .section-subtitle');
    if (subtitle) {
        const beats = all.filter(i => i.type === 'beat').length;
        subtitle.textContent = searching
            ? `${all.length} match${all.length === 1 ? '' : 'es'} for "${searchQuery}"`
            : `${all.length} releases — ${all.length - beats} tracks, ${beats} beats`;
    }

    if (!all.length) {
        root.innerHTML = `<div class="lib-empty">
            <i class="ri-search-line" style="font-size:2.5rem;"></i>
            <p>Nothing matches "${escapeHtml(searchQuery)}".</p>
        </div>`;
        return;
    }

    const tracks = all.filter(i => i.type === 'track');
    const beats = all.filter(i => i.type === 'beat');

    root.innerHTML =
        (searching ? `<p class="lib-searchinfo">Showing matches across every year.</p>` : '') +
        groupHTML('Tracks', 'track', tracks, searching) +
        groupHTML('Beats', 'beat', beats, searching);
}

/* ---------------- interaction ---------------- */

function onRootClick(e) {
    const grid = e.target.closest('[data-grid]');
    if (grid) {                       // Grid toggle sits inside the header button
        e.preventDefault();
        e.stopPropagation();
        grid.closest('.lib-shelf').classList.toggle('is-grid');
        return;
    }

    const head = e.target.closest('[data-toggle]');
    if (!head) return;

    const key = head.dataset.toggle;
    const shelf = head.closest('.lib-shelf');
    const nowOpen = !shelf.classList.contains('is-open');

    shelf.classList.toggle('is-open', nowOpen);
    head.setAttribute('aria-expanded', String(nowOpen));
    if (nowOpen) openShelves.add(key); else openShelves.delete(key);
}

function setFilter(f) {
    currentFilter = f;
    document.querySelectorAll('.filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === f));
    render();
}

/* ---------------- init ---------------- */

async function loadDiscographyData() {
    const root = document.getElementById('releases-content');
    try {
        const res = await fetch('data/discography.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        discographyData = await res.json();
        render();
    } catch (err) {
        console.error('discography:', err.message);
        root.innerHTML = `<div class="lib-empty">
            <i class="ri-error-warning-line" style="font-size:2.5rem;color:#dc3545;"></i>
            <p>Couldn't load the discography.</p>
        </div>`;
    }
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.filter-btn').forEach(btn =>
        btn.addEventListener('click', () => setFilter(btn.dataset.filter)));

    const search = document.getElementById('searchInput');
    if (search) {
        let t;
        search.addEventListener('input', e => {
            clearTimeout(t);
            const v = e.target.value.trim();
            t = setTimeout(() => { searchQuery = v; render(); }, 160);
        });
    }

    const root = document.getElementById('releases-content');
    if (root) root.addEventListener('click', onRootClick);

    loadDiscographyData();
});
