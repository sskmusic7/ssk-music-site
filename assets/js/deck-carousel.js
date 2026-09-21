/**
 * SSK deck carousel — scroll-cycle pitch deck with rotating disk previews.
 *
 * Wheel behaviour is ported from bigheadz-global
 * src/components/TownPortalCarousel.tsx (React -> vanilla):
 *
 *   - IntersectionObserver gates the hijack to when the section is on screen
 *   - while engaged, one wheel gesture advances exactly one slide
 *   - at the boundaries (first + scrolling up, last + scrolling down) we do NOT
 *     preventDefault, so the page scrolls away normally. That release is the
 *     whole reason this doesn't feel like a trap.
 *   - prefers-reduced-motion disables the hijack entirely; CSS turns the stage
 *     into a plain scroll-snap strip.
 */
(function () {
    'use strict';

    var DATA_URL = 'data/deck.json';
    var TRANSITION_MS = 620;   // must exceed the CSS transition (0.55s)
    var WHEEL_THRESHOLD = 18;  // ignore trackpad micro-jitter
    var FADE_MS = 200;

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var els = {};
    var slides = [];
    var index = 0;
    var inViewport = false;

    /* Transition lock as a timestamp, not a boolean cleared by setTimeout.
       Background tabs throttle timers (Chrome can drop them to once a minute),
       and a timer that never fires would leave a boolean lock stuck on
       forever — the carousel would deadlock and never advance again.
       Comparing against Date.now() cannot be throttled. */
    var lockUntil = 0;

    function locked() { return Date.now() < lockUntil; }

    /* ---------------- audio: ONE element shared by every disk ------------- */
    var audio = null;
    var fadeTimer = null;
    var playingOrder = null;

    function getAudio() {
        if (!audio) {
            audio = new Audio();
            audio.preload = 'none';
            audio.volume = 0;
            audio.addEventListener('ended', function () { stopAudio(); });
        }
        return audio;
    }

    function fadeTo(target, done) {
        clearInterval(fadeTimer);
        var a = getAudio();
        var steps = Math.max(1, Math.round(FADE_MS / 25));
        var step = (target - a.volume) / steps;
        var n = 0;
        fadeTimer = setInterval(function () {
            n++;
            var v = a.volume + step;
            a.volume = Math.min(1, Math.max(0, v));
            if (n >= steps) {
                clearInterval(fadeTimer);
                a.volume = target;
                if (done) done();
            }
        }, 25);
    }

    function stopAudio() {
        if (!audio) return;
        fadeTo(0, function () {
            audio.pause();
            try { audio.currentTime = 0; } catch (e) {}
        });
        if (playingOrder !== null) {
            var prev = document.querySelector('.deck-disk[data-order="' + playingOrder + '"]');
            if (prev) {
                prev.classList.remove('is-playing');
                var b = prev.querySelector('.deck-disk-badge');
                if (b) b.textContent = '▶';
            }
        }
        playingOrder = null;
    }

    function playSnippet(slide, diskEl) {
        if (!slide.audio) return;            // manifest not filled in yet
        if (playingOrder === slide.order) { stopAudio(); return; }
        stopAudio();

        var a = getAudio();
        a.src = slide.audio;
        a.volume = 0;
        var p = a.play();
        if (p && p.catch) {
            p.catch(function () { /* autoplay blocked until a real gesture */ });
        }
        fadeTo(1);
        playingOrder = slide.order;
        diskEl.classList.add('is-playing');
        var b = diskEl.querySelector('.deck-disk-badge');
        if (b) b.textContent = '❚❚';
    }

    /* ---------------- rendering ------------------------------------------ */
    function buildSlide(slide) {
        var fig = document.createElement('div');
        fig.className = 'deck-slide';
        fig.dataset.order = slide.order;

        var pic = document.createElement('picture');
        var src = document.createElement('source');
        src.dataset.srcset = slide.image;
        src.type = 'image/webp';
        var img = document.createElement('img');
        img.className = 'deck-slide-img';
        // Source is deferred, not lazy. Off-stage slides are
        // visibility:hidden, and browsers never fetch loading="lazy" images
        // inside a hidden element — so stepping onto a new slide showed a
        // blank frame. preload() assigns src as slides approach the front.
        img.dataset.src = slide.fallback;
        img.alt = slide.title + ' — SSK Music deck';
        img.decoding = 'async';
        img.width = slide.width;
        img.height = slide.height;
        pic.appendChild(src);
        pic.appendChild(img);
        fig.appendChild(pic);

        // No visible caption: every deck page already carries its own title
        // burned into the artwork, and an overlay sat on top of the content.
        // The title still reaches assistive tech via the live region and the
        // dot labels.
        fig.dataset.title = slide.title;

        // disk only on artist slides
        if (slide.kind === 'artist') {
            fig.appendChild(buildDisk(slide));
        }
        return fig;
    }

    function buildDisk(slide) {
        var btn = document.createElement('button');
        btn.className = 'deck-disk';
        btn.type = 'button';
        btn.dataset.order = slide.order;
        btn.setAttribute('aria-label',
            slide.audio ? 'Play a snippet for ' + slide.artist
                        : slide.artist + ' — snippet coming soon');

        var face = document.createElement('span');
        face.className = 'deck-disk-face';

        var label = document.createElement('img');
        label.className = 'deck-disk-label';
        label.src = slide.thumb;
        label.alt = '';
        label.setAttribute('aria-hidden', 'true');

        var badge = document.createElement('span');
        badge.className = 'deck-disk-badge';
        badge.textContent = slide.audio ? '▶' : '♪';

        btn.appendChild(face);
        btn.appendChild(label);
        btn.appendChild(badge);

        // Hover spins the record whether or not there's a snippet behind it.
        // Previously the spin was gated on playSnippet(), which bails when
        // slide.audio is null — so a disk with no audio yet did nothing at
        // all on hover. The spin is the affordance; audio is the bonus.
        if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
            btn.addEventListener('mouseenter', function () {
                btn.classList.add('is-spinning');
                playSnippet(slide, btn);
            });
            btn.addEventListener('mouseleave', function () {
                btn.classList.remove('is-spinning');
                stopAudio();
            });
        }
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            playSnippet(slide, btn);
        });

        return btn;
    }

    /** Position every slide relative to the active one (coverflow). */
    var NEAR = 3;     // how many slides stay on stage each side
    var PRELOAD = 8;  // how far ahead to fetch artwork (was 5 — too late,
                      // slides arrived mid-download and showed the frame)

    /** Attach the real src once a slide is close enough to be seen. */
    function preload(el) {
        var img = el.querySelector('img.deck-slide-img');
        if (!img || img.dataset.loaded) return;
        var source = el.querySelector('source');
        if (source && source.dataset.srcset) source.srcset = source.dataset.srcset;

        // "Told to load" is not "loaded". The frame behind the slides is
        // near-black, so between assigning src and the bytes decoding you
        // just see a black panel — which reads as broken rather than busy.
        // is-loaded is what clears the shimmer, so it has to wait for the
        // real event. Errors clear it too: a shimmer that never stops is
        // worse than a missing image.
        function done() { el.classList.add('is-loaded'); }
        if (img.complete && img.naturalWidth) {
            done();
        } else {
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
        }

        img.src = img.dataset.src;
        img.dataset.loaded = '1';
    }

    function layout() {
        for (var i = 0; i < els.slides.length; i++) {
            var el = els.slides[i];
            var offset = i - index;
            var dist = Math.abs(offset);

            el.style.setProperty('--i', offset);
            el.style.setProperty('--d', dist);

            el.classList.toggle('is-active', offset === 0);
            el.classList.toggle('is-near', dist > 0 && dist <= NEAR);

            if (dist <= PRELOAD) preload(el);

            // keep far slides out of the a11y tree and off the GPU.
            // In reduced-motion the stage is a plain scroll-snap strip, so
            // every slide must stay visible — an inline style here would
            // beat the stylesheet and hide most of the strip.
            el.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
            if (!reduceMotion) {
                el.style.visibility = dist <= NEAR ? 'visible' : 'hidden';
            }
        }
    }

    var KIND_LABEL = {
        cover: 'SSK Music',
        about: 'The Company',
        credential: 'Credentials',
        artist: 'Artist'
    };

    /** The header announces whatever slide you're on. */
    function updateNowPlaying() {
        if (!els.now) return;
        var s = slides[index];
        els.now.classList.add('is-changing');
        setTimeout(function () {
            els.nowKind.textContent = KIND_LABEL[s.kind] || s.kind;
            els.nowTitle.textContent = s.title;
            els.now.classList.remove('is-changing');
        }, 180);
    }

    function go(next, viaScroll) {
        if (locked() || next === index) return;
        if (next < 0 || next >= slides.length) return;

        lockUntil = Date.now() + TRANSITION_MS;
        stopAudio();

        els.dots[index].classList.remove('is-active');
        els.dots[index].setAttribute('aria-current', 'false');

        index = next;
        layout();

        els.dots[index].classList.add('is-active');
        els.dots[index].setAttribute('aria-current', 'true');

        updateNowPlaying();
        els.counter.textContent = (index + 1) + ' / ' + slides.length;
        els.progress.style.width = (((index + 1) / slides.length) * 100) + '%';
        els.prev.disabled = index === 0;
        els.next.disabled = index === slides.length - 1;
        els.live.textContent = 'Slide ' + (index + 1) + ' of ' + slides.length +
                               ': ' + slides[index].title;

        if (viaScroll) els.shell.classList.add('is-engaged');
    }

    /* ---------------- wheel hijack --------------------------------------- */

    /**
     * The wheel listener is bound to the deck section itself, so it only
     * fires when the pointer is actually over the deck. That IS the
     * "am I on the deck" test — an extra geometry check on top of it was
     * what stopped the lock engaging while scrolling over the carousel.
     * Scrolling anywhere else on the page never reaches this handler.
     */
    var wheelAccum = 0;
    var wheelAccumAt = 0;

    function onWheel(e) {
        if (reduceMotion) return;

        var dir = e.deltaY > 0 ? 1 : -1;

        // Boundary release — let the page scroll away.
        if ((index === 0 && dir === -1) ||
            (index === slides.length - 1 && dir === 1)) {
            wheelAccum = 0;
            return;
        }

        // Swallow EVERY event while engaged, including the tiny ones.
        // A trackpad emits a stream of ~5-15px deltas; the old code returned
        // before preventDefault for anything under the threshold, so those
        // leaked straight through and scrolled the page underneath the
        // carousel. The threshold now only decides when to ADVANCE.
        e.preventDefault();

        var now = Date.now();
        if (now - wheelAccumAt > 220) wheelAccum = 0;   // new gesture
        wheelAccumAt = now;

        // reset if the user reverses direction mid-gesture
        if (wheelAccum !== 0 && Math.sign(wheelAccum) !== dir) wheelAccum = 0;
        wheelAccum += e.deltaY;

        if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return;

        wheelAccum = 0;
        go(index + dir, true);   // go() holds the lock, so one flick == one slide
    }

    /* ---------------- touch ---------------------------------------------- */
    var touchY = null, touchX = null;

    function onTouchStart(e) {
        touchY = e.touches[0].clientY;
        touchX = e.touches[0].clientX;
    }

    function onTouchMove(e) {
        if (reduceMotion || touchY === null) return;
        var dy = touchY - e.touches[0].clientY;
        var dx = touchX - e.touches[0].clientX;

        // horizontal swipe -> change slide; vertical -> let the page scroll
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45) {
            e.preventDefault();
            if (!locked()) {
                go(index + (dx > 0 ? 1 : -1), true);
                touchY = touchX = null;
            }
        }
    }

    function onTouchEnd() { touchY = touchX = null; }

    /* ---------------- init ----------------------------------------------- */
    function mount(data) {
        slides = data.slides || [];
        if (!slides.length) return;

        var section = document.getElementById('deck');
        if (!section) return;

        els.shell = section.querySelector('.deck-shell');
        els.stage = section.querySelector('.deck-stage');
        els.dotWrap = section.querySelector('.deck-dots');
        els.counter = section.querySelector('.deck-counter');
        els.prev = section.querySelector('.deck-arrow[data-dir="-1"]');
        els.next = section.querySelector('.deck-arrow[data-dir="1"]');
        els.live = section.querySelector('.deck-live');
        els.now = section.querySelector('.deck-nowplaying');
        els.nowKind = section.querySelector('#deckKind');
        els.nowTitle = section.querySelector('#deckTitle');

        // drive the stage aspect from the real slide dimensions
        var first = slides[0];
        if (first.width && first.height) {
            els.stage.style.setProperty(
                '--deck-aspect', (first.width / first.height).toFixed(4));
        }

        els.progress = document.createElement('div');
        els.progress.className = 'deck-progress';
        els.stage.appendChild(els.progress);

        els.slides = [];
        els.dots = [];

        slides.forEach(function (s, i) {
            var node = buildSlide(s);
            // click a neighbouring page to bring it to the front
            (function (idx) {
                node.addEventListener('click', function (e) {
                    if (e.target.closest('.deck-disk')) return;   // disk handles itself
                    if (idx !== index) { e.preventDefault(); go(idx, false); }
                });
            })(i);
            els.stage.appendChild(node);
            els.slides.push(node);

            var dot = document.createElement('button');
            dot.className = 'deck-dot' + (i === 0 ? ' is-active' : '');
            dot.type = 'button';
            dot.setAttribute('aria-label', 'Go to slide ' + (i + 1) + ': ' + s.title);
            dot.setAttribute('aria-current', i === 0 ? 'true' : 'false');
            dot.addEventListener('click', function () { go(i, false); });
            els.dotWrap.appendChild(dot);
            els.dots.push(dot);
        });

        layout();          // establish the coverflow positions before first paint
        if (els.nowTitle) {
            els.nowKind.textContent = KIND_LABEL[slides[0].kind] || slides[0].kind;
            els.nowTitle.textContent = slides[0].title;
        }

        els.counter.textContent = '1 / ' + slides.length;
        els.progress.style.width = (100 / slides.length) + '%';
        els.prev.disabled = true;
        els.prev.addEventListener('click', function () { go(index - 1, false); });
        els.next.addEventListener('click', function () { go(index + 1, false); });

        if (!reduceMotion) {
            // only used to cut audio when the section scrolls away; the wheel
            // handler is bound to the section, which is its own scope test
            new IntersectionObserver(function (entries) {
                inViewport = entries[0].isIntersecting;
                if (!inViewport) stopAudio();
            }, { threshold: 0 }).observe(section);

            section.addEventListener('wheel', onWheel, { passive: false });
            section.addEventListener('touchstart', onTouchStart, { passive: true });
            section.addEventListener('touchmove', onTouchMove, { passive: false });
            section.addEventListener('touchend', onTouchEnd, { passive: true });
        }

        // keyboard when the carousel has focus
        section.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1, false); }
            if (e.key === 'ArrowLeft')  { e.preventDefault(); go(index - 1, false); }
        });

        window.addEventListener('pagehide', stopAudio);
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) stopAudio();
        });
    }

    function init() {
        fetch(DATA_URL)
            .then(function (r) {
                if (!r.ok) throw new Error('deck.json ' + r.status);
                return r.json();
            })
            .then(mount)
            .catch(function (err) {
                console.error('[deck] ' + err.message);
                var s = document.getElementById('deck');
                if (s) s.style.display = 'none';   // fail quiet, don't leave a hole
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
