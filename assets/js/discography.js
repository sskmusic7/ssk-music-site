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

// Filter items
function filterItems(items) {
    return items.filter(item => {
        // Search filter
        const matchesSearch = !searchQuery ||
            (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.artist && item.artist.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.track && item.track.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesSearch;
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

    // Sort by year (newest first)
    filteredItems.sort((a, b) => b.year - a.year);

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
