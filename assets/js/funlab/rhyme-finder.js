/**
 * SSK Fun Lab — Rhyme Finder
 *
 *   window.SSKFunLab.rhymeFinder.mount(el, opts)
 *
 * Type a word or a whole bar; it rhymes off the LAST word, which is what you
 * actually need when you're writing. Datamuse API — free, no key, CORS open.
 *
 * Syllable counts come back with ?md=s and are shown on each result so you
 * can match the length of the bar you're replacing.
 */
(function () {
    'use strict';

    window.SSKFunLab = window.SSKFunLab || {};

    var API = 'https://api.datamuse.com/words';
    var MODES = [
        { id: 'rel_rhy', label: 'Perfect',     hint: 'true rhymes' },
        { id: 'rel_nry', label: 'Near',        hint: 'slant / half rhymes' },
        { id: 'sl',      label: 'Sounds like', hint: 'phonetically close' }
    ];

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    /** Rhyme off the last real word of whatever was typed. */
    function lastWord(line) {
        var words = String(line || '')
            .replace(/[^\p{L}\p{N}'\s-]/gu, ' ')
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        return words.length ? words[words.length - 1].toLowerCase() : '';
    }

    function mount(root, opts) {
        opts = opts || {};
        root.classList.add('funlab-rhyme-finder');
        root.innerHTML = '';

        var mode = MODES[0].id;
        var controller = null;
        var debounce = null;

        var form = el('form', 'frf-form');
        var input = el('input', 'frf-input');
        input.type = 'search';
        input.placeholder = 'Type a word — or a whole bar';
        input.setAttribute('aria-label', 'Word or line to rhyme');
        input.autocomplete = 'off';
        var go = el('button', 'frf-go', 'Find');
        go.type = 'submit';
        form.appendChild(input);
        form.appendChild(go);

        var tabs = el('div', 'frf-tabs');
        MODES.forEach(function (m, i) {
            var b = el('button', 'frf-tab' + (i === 0 ? ' is-active' : ''), m.label);
            b.type = 'button';
            b.dataset.mode = m.id;
            b.title = m.hint;
            b.addEventListener('click', function () {
                mode = m.id;
                [].forEach.call(tabs.children, function (x) {
                    x.classList.toggle('is-active', x.dataset.mode === mode);
                });
                run();
            });
            tabs.appendChild(b);
        });

        var status = el('div', 'frf-status', 'Rhymes off the last word of whatever you type.');
        var list = el('div', 'frf-list');

        root.appendChild(form);
        root.appendChild(tabs);
        root.appendChild(status);
        root.appendChild(list);

        form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
        input.addEventListener('input', function () {
            clearTimeout(debounce);
            debounce = setTimeout(run, 400);
        });

        function run() {
            var word = lastWord(input.value);
            if (!word) {
                list.innerHTML = '';
                status.textContent = 'Rhymes off the last word of whatever you type.';
                return;
            }

            if (controller) controller.abort();
            controller = new AbortController();

            status.textContent = 'Looking for rhymes for "' + word + '"…';

            query(mode, word)
                .then(function (results) {
                    // Datamuse's near-rhyme index is sparse — rel_nry returns
                    // nothing at all for plenty of common words ("flow" is one).
                    // Rather than dead-end, fall back to sounds-like and say so.
                    if (!results.length && mode === 'rel_nry') {
                        return query('sl', word).then(function (alt) {
                            render(word, alt, 'no near rhymes indexed for');
                        });
                    }
                    render(word, results);
                })
                .catch(function (err) {
                    if (err.name === 'AbortError') return;
                    // the tool failing must not take the page with it
                    list.innerHTML = '';
                    status.textContent =
                        "Couldn't reach the rhyme dictionary. Check your connection and try again.";
                    console.error('[rhyme-finder]', err.message);
                });
        }

        function query(which, word) {
            var url = API + '?' + which + '=' + encodeURIComponent(word) + '&md=s&max=60';
            return fetch(url, { signal: controller.signal }).then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            });
        }

        function render(word, results, prefix) {
            list.innerHTML = '';

            if (!results.length) {
                // don't point at the tab they're already on
                var others = MODES
                    .filter(function (m) { return m.id !== mode; })
                    .map(function (m) { return m.label; })
                    .join(' or ');
                status.textContent = 'Nothing for "' + word + '". Try ' + others + '.';
                return;
            }

            status.textContent = prefix
                ? prefix + ' "' + word + '" — showing ' + results.length + ' that sound like it'
                : results.length + ' for "' + word + '" — click to copy';

            // group by syllable count so bars can be matched by length
            var groups = {};
            results.forEach(function (r) {
                var syl = (r.numSyllables != null) ? r.numSyllables : '?';
                (groups[syl] = groups[syl] || []).push(r);
            });

            Object.keys(groups)
                .sort(function (a, b) { return a - b; })
                .forEach(function (syl) {
                    var g = el('div', 'frf-group');
                    g.appendChild(el('div', 'frf-group-head',
                        syl + (syl === '1' ? ' syllable' : ' syllables')));
                    var wrap = el('div', 'frf-words');
                    groups[syl].forEach(function (r) {
                        var b = el('button', 'frf-word', r.word);
                        b.type = 'button';
                        b.addEventListener('click', function () { copy(r.word, b); });
                        wrap.appendChild(b);
                    });
                    g.appendChild(wrap);
                    list.appendChild(g);
                });
        }

        function copy(text, btn) {
            var done = function () {
                var was = btn.textContent;
                btn.classList.add('is-copied');
                btn.textContent = 'copied';
                setTimeout(function () {
                    btn.textContent = was;
                    btn.classList.remove('is-copied');
                }, 750);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done, done);
            } else {
                done();
            }
        }

        return {
            destroy: function () {
                clearTimeout(debounce);
                if (controller) controller.abort();
                root.innerHTML = '';
            }
        };
    }

    window.SSKFunLab.rhymeFinder = { mount: mount };
})();
