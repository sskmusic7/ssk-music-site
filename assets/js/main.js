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
        //
        // The fragment matters. "index.html#services" is a link to a section,
        // not to a page — marking it aria-current="page" on the homepage (which
        // an earlier version did, by stripping the "#" before comparing) tells
        // a screen reader the wrong thing and lights up the wrong nav item. So:
        // a bare fragment ("#hero") always means this page; a path plus a
        // fragment never does.
        var here = (location.pathname.replace(/\/$/, '').split('/').pop() || 'index')
            .replace(/\.html$/, '');

        document.querySelectorAll('.sticky-nav-link').forEach(function (a) {
            var href = a.getAttribute('href') || '';
            if (!href) return;

            var hash = href.indexOf('#');
            var path = (hash === -1 ? href : href.slice(0, hash))
                .replace(/\.html$/, '').replace(/\/$/, '');

            var isCurrent = path === ''
                ? hash !== -1          // bare fragment: same page by definition
                : hash === -1 && path === here;

            if (isCurrent) a.setAttribute('aria-current', 'page');
        });
    });
})();
