$(document).ready(function() {
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
