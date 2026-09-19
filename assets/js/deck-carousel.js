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
        src.srcset = slide.image;
        src.type = 'image/webp';
        var img = document.createElement('img');
        img.className = 'deck-slide-img';
        img.src = slide.fallback;
        img.alt = slide.title + ' — SSK Music deck';
        // first two eager so the stage is never empty; rest lazy
        img.loading = slide.order <= 2 ? 'eager' : 'lazy';
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

        // hover preview on pointer devices only; tap/click always works
        if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
            btn.addEventListener('mouseenter', function () { playSnippet(slide, btn); });
            btn.addEventListener('mouseleave', function () { stopAudio(); });
        }
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            playSnippet(slide, btn);
        });

        return btn;
    }

    function go(next, viaScroll) {
        if (locked() || next === index) return;
        if (next < 0 || next >= slides.length) return;

        lockUntil = Date.now() + TRANSITION_MS;
        stopAudio();

        els.slides[index].classList.remove('is-active');
        els.dots[index].classList.remove('is-active');
        els.dots[index].setAttribute('aria-current', 'false');

        index = next;

        els.slides[index].classList.add('is-active');
        els.dots[index].classList.add('is-active');
        els.dots[index].setAttribute('aria-current', 'true');

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
     * Engage while the stage straddles the middle of the viewport.
     *
     * An IntersectionObserver ratio is the wrong tool here: the section is
     * ~1150px tall, so on a 754px viewport the ratio tops out at 0.65 and on a
     * 600px laptop it never clears 0.52. A threshold would silently stop
     * working on shorter screens. This test is viewport-height independent.
     */
    function stageEngaged() {
        var r = els.stage.getBoundingClientRect();
        var mid = window.innerHeight / 2;
        return r.top < mid && r.bottom > mid;
    }

    function onWheel(e) {
        if (reduceMotion || !stageEngaged()) return;
        if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;

        var dir = e.deltaY > 0 ? 1 : -1;

        // Boundary release — let the page scroll away.
        if ((index === 0 && dir === -1) ||
            (index === slides.length - 1 && dir === 1)) {
            return;
        }

        e.preventDefault();

        // go() applies the same lock, so one flick == one slide
        go(index + dir, true);
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
            if (i === 0) node.classList.add('is-active');
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

        els.counter.textContent = '1 / ' + slides.length;
        els.progress.style.width = (100 / slides.length) + '%';
        els.prev.disabled = true;
        els.prev.addEventListener('click', function () { go(index - 1, false); });
        els.next.addEventListener('click', function () { go(index + 1, false); });

        if (!reduceMotion) {
            // only used to cut audio when the section scrolls away; the wheel
            // gate is stageEngaged(), which doesn't depend on viewport height
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
