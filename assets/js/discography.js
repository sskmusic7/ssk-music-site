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
function createReleaseCard(item) {
    const typeLabel = item.type === 'album' ? 'Album' : 'Single';
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

    return `
        <div class="release-card" data-type="${item.type}" data-year="${item.year}">
            <div class="release-image">
                <img src="assets/images/album-1.jpg" alt="${item.title}">
            </div>
            <div class="release-type">${typeLabel}</div>
            <div class="release-info">
                <h4 class="release-title">${item.title}</h4>
                <div class="release-artist">
                    <i class="ri-user-3-line"></i>
                    ${item.artist}
                    ${item.producer ? ` · Produced by ${item.producer}` : ''}
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

// Create credit card HTML
function createCreditCard(item, tier) {
    const tierLabel = tier.toUpperCase();
    const tierClass = tier.toLowerCase() + '-tier';

    const statsHTML = item.youtube_views || item.spotify_streams ? `
        <div class="credit-stats">
            <div class="credit-label">${item.youtube_views ? 'YouTube Views' : 'Spotify Streams'}</div>
            <div class="stat-item">
                <i class="${item.youtube_views ? 'ri-youtube-fill' : 'ri-spotify-fill'}"></i>
                <span>${formatNumber(item.youtube_views || item.spotify_streams)}</span>
            </div>
        </div>
    ` : '';

    const platformsHTML = item.genius ? `
        <div class="credit-platforms">
            <a href="${item.genius}" target="_blank" class="platform-link">
                <i class="ri-brain-line"></i>
                <span>Genius</span>
            </a>
        </div>
    ` : '';

    return `
        <div class="credit-card" data-tier="${tier}">
            <div class="credit-header">
                <span class="credit-tier ${tierClass}">${tier}-List</span>
            </div>
            <div class="credit-info">
                <h4 class="credit-track">${item.track}</h4>
                <div class="credit-artist">
                    <i class="ri-user-3-line"></i>
                    ${item.artist}
                </div>
                <div class="credit-role">
                    Role: <span>${item.role}</span>
                </div>
                ${item.label ? `<div class="credit-year">Label: ${item.label}</div>` : ''}
                <div class="credit-year">${item.year}</div>
                ${statsHTML}
                ${platformsHTML}
            </div>
        </div>
    `;
}

// Filter and search items
function filterItems(items) {
    return items.filter(item => {
        // Search filter
        const matchesSearch = !searchQuery ||
            (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.artist && item.artist.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.track && item.track.toLowerCase().includes(searchQuery.toLowerCase()));

        // Type filter
        const matchesType = currentFilter === 'all' ||
            (currentFilter === 'beats' && item.type === 'beat') ||
            (currentFilter === 'albums' && item.type === 'album') ||
            (currentFilter === 'credits');

        return matchesSearch && matchesType;
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

    const allItems = [
        ...(discographyData.releases.beats || []),
        ...(discographyData.releases.albums || [])
    ];

    // Apply filter
    let filteredItems = filterItems(allItems);

    // Filter out credits-only items from releases tab
    if (currentFilter === 'all' || currentFilter === 'beats' || currentFilter === 'albums') {
        filteredItems = filteredItems.filter(item => item.type !== 'credit');
    }

    if (filteredItems.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="ri-search-line" style="font-size: 3rem; color: #999;"></i>
                <p style="font-family: 'Inter', sans-serif; color: #666; margin-top: 1rem;">No releases found matching your search.</p>
            </div>
        `;
        return;
    }

    // Sort by year (newest first)
    filteredItems.sort((a, b) => b.year - a.year);

    content.innerHTML = filteredItems.map(createReleaseCard).join('');
}

// Render credits section
function renderCredits() {
    const content = document.getElementById('credits-content');
    const loading = document.getElementById('creditsLoading');

    if (!discographyData) {
        loading.style.display = 'block';
        return;
    }

    loading.style.display = 'none';

    const allItems = [
        ...(discographyData.production_credits.a_list || []).map(item => ({...item, tier: 'a'})),
        ...(discographyData.production_credits.b_list || []).map(item => ({...item, tier: 'b'}))
    ];

    // Apply search filter
    const filteredItems = allItems.filter(item => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (item.track && item.track.toLowerCase().includes(query)) ||
               (item.artist && item.artist.toLowerCase().includes(query));
    });

    if (filteredItems.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="ri-music-2-line" style="font-size: 3rem; color: #999;"></i>
                <p style="font-family: 'Inter', sans-serif; color: #666; margin-top: 1rem;">No credits found matching your search.</p>
            </div>
        `;
        return;
    }

    // Sort by year (newest first)
    filteredItems.sort((a, b) => b.year - a.year);

    content.innerHTML = filteredItems.map(item => createCreditCard(item, item.tier)).join('');
}

// Update display based on tab
function updateDisplay() {
    const releasesSection = document.getElementById('releases-section');
    const creditsSection = document.getElementById('credits-section');

    if (currentTab === 'releases') {
        releasesSection.style.display = 'block';
        creditsSection.style.display = 'none';
        renderReleases();
    } else {
        releasesSection.style.display = 'none';
        creditsSection.style.display = 'block';
        renderCredits();
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

    // Update display
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

    // Switch to releases tab if selecting beats/albums
    if (filter === 'beats' || filter === 'albums') {
        currentTab = 'releases';
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === 'releases') {
                btn.classList.add('active');
            }
        });
    }

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
        document.getElementById('releases-content').innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="ri-error-warning-line" style="font-size: 3rem; color: #dc3545;"></i>
                <p style="font-family: 'Inter', sans-serif; color: #666; margin-top: 1rem;">Error loading discography data.</p>
            </div>
        `;
        document.getElementById('credits-content').innerHTML = '';
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
