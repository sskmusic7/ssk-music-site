/**
 * SSK MUSIC DISCOGRAPHY JAVASCRIPT
 * Loads data from JSON and handles tab switching, filtering, and search
 */

// Global state
let discographyData = null;
let currentTab = 'releases';
let currentFilter = 'all';
let searchQuery = '';

// Format numbers with commas
function formatNumber(num) {
    return num.toLocaleString('en-GB');
}

// Format streams/plays with K/M notation
function formatStreams(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    } else {
        return num.toLocaleString();
    }
}

// Create release card HTML
function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function createReleaseCard(item) {
    const typeLabel = item.type === 'beat' ? 'Beat' : 'Track';
    const viewsHTML = item.youtube_views || item.spotify_streams ? `
        <div class="release-stats">
            ${item.youtube_views ? `
            <div class="stat-item">
                <i class="ri-youtube-fill"></i>
                <span>${formatNumber(item.youtube_views)}</span>
            </div>
            ` : ''}
            ${item.spotify_streams ? `
            <div class="stat-item">
                <i class="ri-spotify-fill"></i>
                <span>${formatStreams(item.spotify_streams)}</span>
            </div>
            ` : ''}
        </div>
    ` : '';

    const platformsHTML = Object.keys(item.platforms || {}).map(platform => {
        const platformNames = {
            'youtube': 'YouTube',
            'spotify': 'Spotify',
            'beatstars': 'BeatStars',
            'genius': 'Genius',
            'apple_music': 'Apple Music'
        };
        const iconNames = {
            'youtube': 'ri-youtube-fill',
            'spotify': 'ri-spotify-fill',
            'beatstars': 'ri-disc-fill',
            'genius': 'ri-brain-line',
            'apple_music': 'ri-music-fill'
        };
        return `
            <a href="${item.platforms[platform]}" target="_blank" class="platform-link">
                <i class="${iconNames[platform]}"></i>
                <span>${platformNames[platform]}</span>
            </a>
        `;
    }).join('');

    // Real artwork from YouTube. maxresdefault isn't generated for every
    // upload, so fall back to hqdefault (always exists) rather than the
    // single hardcoded album-1.jpg that used to be on every card.
    const art = item.artwork || '';
    const artFallback = item.artwork_fallback || 'assets/images/album-1.jpg';

    const subtitle = item.type === 'beat'
        ? (item.typeBeatFor ? `${escapeHtml(item.typeBeatFor)} type beat` : 'Type beat')
        : `${escapeHtml(item.artist)}${item.producer ? ` · Prod. ${escapeHtml(item.producer)}` : ''}`;

    return `
        <div class="release-card" data-type="${item.type}" data-year="${item.year}">
            <div class="release-image">
                <img src="${art}" alt="${escapeHtml(item.title)}" loading="lazy"
                     onerror="this.onerror=null;this.src='${artFallback}';">
            </div>
            <div class="release-type">${typeLabel}</div>
            <div class="release-info">
                <h4 class="release-title">${escapeHtml(item.title)}</h4>
                <div class="release-artist">
                    <i class="ri-user-3-line"></i>
                    ${subtitle}
                </div>
                <div class="release-year">${item.year}</div>
                ${viewsHTML}
                <div class="release-platforms">
                    ${platformsHTML}
                </div>
            </div>
        </div>
    `;
}

// Filter items
//
// This previously only looked at searchQuery and never read currentFilter,
// which is why the Beats / Albums buttons did nothing at all: handleFilter()
// set the variable and re-rendered, but no code consumed it.
function filterItems(items) {
    const q = searchQuery.toLowerCase();

    return items.filter(item => {
        // type filter: "all" | "beat" | "track"
        const matchesType = currentFilter === 'all' || item.type === currentFilter;
        if (!matchesType) return false;

        if (!q) return true;

        return [item.title, item.artist, item.producer, item.typeBeatFor]
            .some(v => v && String(v).toLowerCase().includes(q));
    });
}

// Render releases section
function renderReleases() {
    const content = document.getElementById('releases-content');
    const loading = document.getElementById('releasesLoading');

    if (!discographyData) {
        loading.style.display = 'block';
        return;
    }

    loading.style.display = 'none';

    // Get all release items
    const allItems = discographyData.releases || [];

    // Apply filter
    let filteredItems = filterItems(allItems);

    if (filteredItems.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="ri-search-line" style="font-size: 3rem; color: #999;"></i>
                <p style="font-family: 'Inter', sans-serif; color: #666; margin-top: 1rem;">No releases found matching your search.</p>
            </div>
        `;
        return;
    }

    // Newest first. Sort on the full publish date, not just the year —
    // sorting by year alone left everything within a year in arbitrary order.
    filteredItems.sort((a, b) =>
        String(b.publishedAt || b.year).localeCompare(String(a.publishedAt || a.year)));

    const subtitle = document.querySelector('#releases-section .section-subtitle');
    if (subtitle) {
        const beats = filteredItems.filter(i => i.type === 'beat').length;
        const tracks = filteredItems.length - beats;
        subtitle.textContent = `${filteredItems.length} releases — ${tracks} tracks, ${beats} beats`;
    }

    content.innerHTML = filteredItems.map(createReleaseCard).join('');
}

// Update display based on tab
function updateDisplay() {
    const releasesSection = document.getElementById('releases-section');

    if (currentTab === 'releases') {
        releasesSection.style.display = 'block';
        renderReleases();
    } else {
        releasesSection.style.display = 'none';
    }
}

// Handle tab switching
function switchTab(tab) {
    currentTab = tab;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });

    updateDisplay();
}

// Handle filter buttons
function handleFilter(filter) {
    currentFilter = filter;

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });

    updateDisplay();
}

// Handle search input
function handleSearch(query) {
    searchQuery = query.trim();
    updateDisplay();
}

// Load data from JSON
async function loadDiscographyData() {
    try {
        const response = await fetch('data/discography.json');
        discographyData = await response.json();
        updateDisplay();
    } catch (error) {
        console.error('Error loading discography data:', error);
        const content = document.getElementById('releases-content');
        content.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="ri-error-warning-line" style="font-size: 3rem; color: #dc3545;"></i>
                <p style="font-family: 'Inter', sans-serif; color: #666; margin-top: 1rem;">Error loading discography data.</p>
            </div>
        `;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Tab click handlers
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // Filter button handlers
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleFilter(btn.dataset.filter);
        });
    });

    // Search input handler
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            handleSearch(e.target.value);
        });
    }

    // Load data
    loadDiscographyData();
});
