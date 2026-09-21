/**
 * SSK Fun Lab — Stem Replicator
 *
 *   window.SSKFunLab.stemReplicator.mount(el, { audioContext })
 *
 * Plays a 16-bar loop as separate stems so you can hear the arrangement
 * being built up. Mute/solo do NOT restart playback — every stem starts on
 * the same sample-accurate timestamp and stays running for the life of the
 * session; toggling only ramps a per-stem GainNode. That is the whole point:
 * stopping and restarting a source would drift them apart within a few bars.
 */
(function () {
    'use strict';

    window.SSKFunLab = window.SSKFunLab || {};

    var MANIFEST = 'assets/funlab/stems/african-dream/manifest.json';
    var RAMP = 0.06;   // seconds — short enough to feel instant, long enough not to click

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    function mount(root, opts) {
        opts = opts || {};
        root.classList.add('funlab-stem-replicator');
        root.innerHTML = '';

        var ctx = opts.audioContext || null;
        var manifest = null;
        var buffers = {};
        var gains = {};
        var sources = {};
        var muted = {};
        var soloed = null;
        var startedAt = 0;
        var playing = false;
        var raf = 0;

        /* ---------- shell ---------- */
        var head = el('div', 'fsr-head');
        var title = el('div', 'fsr-title', 'Stem Replicator');
        var meta = el('div', 'fsr-meta', 'loading…');
        head.appendChild(title);
        head.appendChild(meta);

        var rows = el('div', 'fsr-rows');

        var bar = el('div', 'fsr-timeline');
        var fill = el('div', 'fsr-timeline-fill');
        bar.appendChild(fill);

        var foot = el('div', 'fsr-foot');
        var play = el('button', 'fsr-play', 'Play');
        play.type = 'button';
        play.disabled = true;
        var counter = el('div', 'fsr-counter', 'Bar — / —');
        var reset = el('button', 'fsr-reset', 'All on');
        reset.type = 'button';
        foot.appendChild(play);
        foot.appendChild(counter);
        foot.appendChild(reset);

        root.appendChild(head);
        root.appendChild(rows);
        root.appendChild(bar);
        root.appendChild(foot);

        /* ---------- load ---------- */
        fetch(MANIFEST)
            .then(function (r) {
                if (!r.ok) throw new Error('manifest ' + r.status);
                return r.json();
            })
            .then(function (m) {
                manifest = m;
                meta.textContent = m.artist + ' — ' + m.title + ' · ' +
                                   m.bpm + ' BPM · ' + m.bars + ' bars';
                m.stems.forEach(function (s) {
                    muted[s.id] = false;
                    rows.appendChild(buildRow(s));
                });
                play.disabled = false;
                play.textContent = 'Play';
            })
            .catch(function (e) {
                meta.textContent = "Couldn't load the stems.";
                console.error('[stem-replicator]', e.message);
            });

        function buildRow(stem) {
            var row = el('div', 'fsr-row');
            row.dataset.stem = stem.id;

            var name = el('button', 'fsr-name', stem.label);
            name.type = 'button';
            name.setAttribute('aria-pressed', 'true');
            name.addEventListener('click', function () { toggleMute(stem.id); });

            var solo = el('button', 'fsr-solo', 'S');
            solo.type = 'button';
            solo.title = 'Solo';
            solo.addEventListener('click', function () { toggleSolo(stem.id); });

            var level = el('div', 'fsr-level');
            var lf = el('div', 'fsr-level-fill');
            level.appendChild(lf);
            row._level = lf;

            row.appendChild(name);
            row.appendChild(solo);
            row.appendChild(level);
            return row;
        }

        /* ---------- audio ---------- */
        // opts.getAudioContext is a FACTORY, not a live context: taking a
        // context at mount time would construct it before any user gesture,
        // which browsers start in a suspended state and warn about. It's only
        // called here, inside the click handler.
        function ensureCtx() {
            if (!ctx) {
                ctx = opts.getAudioContext
                    ? opts.getAudioContext()
                    : new (window.AudioContext || window.webkitAudioContext)();
            }
            if (ctx.state === 'suspended') ctx.resume();
            return ctx;
        }

        function loadBuffers() {
            return Promise.all(manifest.stems.map(function (s) {
                return fetch(s.src)
                    .then(function (r) { return r.arrayBuffer(); })
                    .then(function (ab) {
                        return new Promise(function (res, rej) {
                            ctx.decodeAudioData(ab, function (b) { buffers[s.id] = b; res(); }, rej);
                        });
                    });
            }));
        }

        function startAll() {
            // One shared start time for every stem. Scheduling them against the
            // same `when` is what keeps them locked together.
            var when = ctx.currentTime + 0.12;
            startedAt = when;

            manifest.stems.forEach(function (s) {
                var src = ctx.createBufferSource();
                src.buffer = buffers[s.id];
                src.loop = true;
                src.loopStart = 0;
                src.loopEnd = buffers[s.id].duration;

                var g = ctx.createGain();
                g.gain.value = gainFor(s.id);

                src.connect(g).connect(ctx.destination);
                src.start(when);

                sources[s.id] = src;
                gains[s.id] = g;
            });
        }

        function stopAll() {
            Object.keys(sources).forEach(function (id) {
                try { sources[id].stop(); } catch (e) {}
                sources[id].disconnect();
            });
            sources = {};
            gains = {};
        }

        function gainFor(id) {
            if (soloed) return id === soloed ? 1 : 0;
            return muted[id] ? 0 : 1;
        }

        function applyGains() {
            if (!ctx) return;
            Object.keys(gains).forEach(function (id) {
                var g = gains[id].gain;
                g.cancelScheduledValues(ctx.currentTime);
                g.setTargetAtTime(gainFor(id), ctx.currentTime, RAMP);
            });
            paintRows();
        }

        function toggleMute(id) {
            if (soloed) soloed = null;         // leaving solo mode
            muted[id] = !muted[id];
            applyGains();
        }

        function toggleSolo(id) {
            soloed = (soloed === id) ? null : id;
            applyGains();
        }

        function paintRows() {
            [].forEach.call(rows.children, function (row) {
                var id = row.dataset.stem;
                var on = gainFor(id) > 0;
                row.classList.toggle('is-off', !on);
                row.classList.toggle('is-solo', soloed === id);
                row.querySelector('.fsr-name').setAttribute('aria-pressed', String(on));
            });
        }

        /* ---------- transport ---------- */
        play.addEventListener('click', function () {
            ensureCtx();
            if (playing) {
                stopAll();
                playing = false;
                play.textContent = 'Play';
                cancelAnimationFrame(raf);
                counter.textContent = 'Bar — / —';
                fill.style.width = '0%';
                return;
            }
            play.disabled = true;
            play.textContent = 'Loading…';

            var need = Object.keys(buffers).length === 0;
            (need ? loadBuffers() : Promise.resolve())
                .then(function () {
                    startAll();
                    playing = true;
                    play.disabled = false;
                    play.textContent = 'Stop';
                    tick();
                })
                .catch(function (e) {
                    play.disabled = false;
                    play.textContent = 'Play';
                    meta.textContent = "Couldn't decode the stems.";
                    console.error('[stem-replicator]', e);
                });
        });

        reset.addEventListener('click', function () {
            soloed = null;
            Object.keys(muted).forEach(function (k) { muted[k] = false; });
            applyGains();
        });

        function tick() {
            if (!playing) return;
            var pos = (ctx.currentTime - startedAt) % manifest.duration;
            if (pos < 0) pos = 0;
            var barNo = Math.floor(pos / manifest.barSeconds) + 1;
            counter.textContent = 'Bar ' + barNo + ' / ' + manifest.bars;
            fill.style.width = ((pos / manifest.duration) * 100).toFixed(2) + '%';
            raf = requestAnimationFrame(tick);
        }

        return {
            destroy: function () {
                cancelAnimationFrame(raf);
                stopAll();
                root.innerHTML = '';
            }
        };
    }

    window.SSKFunLab.stemReplicator = { mount: mount };
})();
