/**
 * Site-wide script.
 *
 * This file used to contain a verbatim copy of the discography page's init
 * block — tab handlers, filter handlers, and a bare call to
 * loadDiscographyData(). main.js is loaded on every page, but
 * discography.js (which defines those functions) is only loaded on the
 * discography page, so on index.html and contact.html line 25 threw:
 *
 *     Uncaught ReferenceError: loadDiscographyData is not defined
 *
 * That exception aborted the rest of the jQuery ready handler, which is why
 * navigation links on those pages stopped responding.
 *
 * discography.js binds its own handlers inside its own DOMContentLoaded, so
 * none of that duplication was ever needed. Left intentionally minimal — the
 * three pages that reference this file would 404 if it were deleted.
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        // A link pointing at the page you're already on can't navigate, which
        // reads as "broken". Mark it so it looks deliberate instead.
        var here = location.pathname.replace(/\/$/, '').split('/').pop() || 'index';
        document.querySelectorAll('.sticky-nav-link').forEach(function (a) {
            var href = (a.getAttribute('href') || '').split('#')[0];
            if (!href) return;
            var target = href.replace(/\.html$/, '').replace(/\/$/, '') || 'index';
            if (target === here.replace(/\.html$/, '')) {
                a.setAttribute('aria-current', 'page');
            }
        });
    });
})();
