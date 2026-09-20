/**
 * SSK Fun Lab — Drum Pattern Cheat Sheet
 *
 *   window.SSKFunLab.drumPatterns.mount(el, opts)
 *
 * A reference grid of classic 16-step patterns. Read-only by design: it's a
 * cheat sheet, not a sequencer. `opts.onLoad(pattern)` fires when "Load into
 * Beat Machine" is pressed so the sequencer can pick it up once it exists.
 *
 * Audible preview uses a scheduler with lookahead against
 * audioContext.currentTime — setInterval drifts audibly inside a minute and
 * would make a metronome-like tool feel broken.
 */
(function () {
    'use strict';

    window.SSKFunLab = window.SSKFunLab || {};

    var DATA = 'data/funlab/drum-patterns.json';
    var LOOKAHEAD = 0.1;    // seconds of audio scheduled ahead
    var TIMER_MS = 25;      // how often we top the schedule up

    var TRACK_LABEL = {
        kick: 'Kick', snare: 'Snare', clap: 'Clap',
        hat: 'Hat', openhat: 'Open Hat', perc: 'Perc'
    };

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    function mount(root, opts) {
        opts = opts || {};
        root.classList.add('funlab-drum-patterns');
        root.innerHTML = '';

        var data = null, current = null;
        var ctx = null, playing = false, step = 0;
        var nextNoteTime = 0, timer = null;

        var tabs = el('div', 'fdp-tabs');
        var head = el('div', 'fdp-head');
        var name = el('h3', 'fdp-name', 'Loading…');
        var info = el('div', 'fdp-info', '');
        head.appendChild(name);
        head.appendChild(info);

        var grid = el('div', 'fdp-grid');
        var tip = el('p', 'fdp-tip', '');

        var foot = el('div', 'fdp-foot');
        var play = el('button', 'fdp-play', 'Preview');
        play.type = 'button';
        var send = el('button', 'fdp-send', 'Load into Beat Machine');
        send.type = 'button';
        send.disabled = !opts.onLoad;
        send.title = opts.onLoad ? '' : 'Beat Machine not built yet';
        foot.appendChild(play);
        foot.appendChild(send);

        root.appendChild(tabs);
        root.appendChild(head);
        root.appendChild(grid);
        root.appendChild(tip);
        root.appendChild(foot);

        fetch(DATA)
            .then(function (r) {
                if (!r.ok) throw new Error('patterns ' + r.status);
                return r.json();
            })
            .then(function (d) {
                data = d;
                d.patterns.forEach(function (p, i) {
                    var b = el('button', 'fdp-tab' + (i === 0 ? ' is-active' : ''), p.name);
                    b.type = 'button';
                    b.dataset.id = p.id;
                    b.addEventListener('click', function () { select(p.id); });
                    tabs.appendChild(b);
                });
                select(d.patterns[0].id);
            })
            .catch(function (e) {
                name.textContent = "Couldn't load the patterns.";
                console.error('[drum-patterns]', e.message);
            });

        function select(id) {
            current = data.patterns.filter(function (p) { return p.id === id; })[0];
            if (!current) return;

            [].forEach.call(tabs.children, function (b) {
                b.classList.toggle('is-active', b.dataset.id === id);
            });

            name.textContent = current.name;
            info.textContent = current.bpm + ' BPM · ' + current.family;
            tip.textContent = current.tip || '';
            drawGrid();
            if (playing) { stop(); start(); }   // retune the preview
        }

        function drawGrid() {
            grid.innerHTML = '';
            var steps = data.meta.steps;

            var ruler = el('div', 'fdp-row fdp-ruler');
            ruler.appendChild(el('div', 'fdp-label', ''));
            for (var s = 0; s < steps; s++) {
                ruler.appendChild(el('div', 'fdp-beat' + (s % 4 === 0 ? ' is-downbeat' : ''),
                                     s % 4 === 0 ? String(s / 4 + 1) : ''));
            }
            grid.appendChild(ruler);

            data.meta.tracks.forEach(function (t) {
                var pat = current.tracks[t];
                if (!pat || pat.indexOf(1) === -1) return;   // hide empty lanes
                var row = el('div', 'fdp-row');
                row.dataset.track = t;
                row.appendChild(el('div', 'fdp-label', TRACK_LABEL[t] || t));
                pat.forEach(function (v, i) {
                    var c = el('div', 'fdp-cell' + (v ? ' is-on' : '') +
                                      (i % 4 === 0 ? ' is-downbeat' : ''));
                    c.dataset.step = i;
                    row.appendChild(c);
                });
                grid.appendChild(row);
            });
        }

        /* ---------- preview ---------- */
        function ensureCtx() {
            if (!ctx) {
                ctx = opts.getAudioContext
                    ? opts.getAudioContext()
                    : new (window.AudioContext || window.webkitAudioContext)();
            }
            if (ctx.state === 'suspended') ctx.resume();
            return ctx;
        }

        // Synthesised, so the cheat sheet needs no sample assets of its own.
        function voice(track, when) {
            var g = ctx.createGain();
            g.connect(ctx.destination);

            if (track === 'kick') {
                var o = ctx.createOscillator();
                o.frequency.setValueAtTime(140, when);
                o.frequency.exponentialRampToValueAtTime(48, when + 0.11);
                g.gain.setValueAtTime(0.9, when);
                g.gain.exponentialRampToValueAtTime(0.001, when + 0.22);
                o.connect(g); o.start(when); o.stop(when + 0.24);
                return;
            }
            // everything else is filtered noise
            var len = track === 'openhat' ? 0.26 : 0.09;
            var buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
            var ch = buf.getChannelData(0);
            for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
            var src = ctx.createBufferSource(); src.buffer = buf;

            var f = ctx.createBiquadFilter();
            if (track === 'hat' || track === 'openhat') {
                f.type = 'highpass'; f.frequency.value = 7000;
                g.gain.setValueAtTime(track === 'openhat' ? 0.22 : 0.16, when);
            } else if (track === 'snare') {
                f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
                g.gain.setValueAtTime(0.5, when);
            } else if (track === 'clap') {
                f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.2;
                g.gain.setValueAtTime(0.42, when);
            } else {                                   // perc
                f.type = 'bandpass'; f.frequency.value = 3400; f.Q.value = 1.5;
                g.gain.setValueAtTime(0.2, when);
            }
            g.gain.exponentialRampToValueAtTime(0.001, when + len);
            src.connect(f).connect(g);
            src.start(when); src.stop(when + len);
        }

        function scheduler() {
            var stepDur = (60 / current.bpm) / 4;    // 16th notes
            while (nextNoteTime < ctx.currentTime + LOOKAHEAD) {
                var s = step;
                data.meta.tracks.forEach(function (t) {
                    var pat = current.tracks[t];
                    if (pat && pat[s]) voice(t, nextNoteTime);
                });
                paintStep(s, nextNoteTime - ctx.currentTime);
                nextNoteTime += stepDur;
                step = (step + 1) % data.meta.steps;
            }
        }

        function paintStep(s, delay) {
            setTimeout(function () {
                [].forEach.call(grid.querySelectorAll('.fdp-cell.is-cursor'),
                    function (c) { c.classList.remove('is-cursor'); });
                [].forEach.call(grid.querySelectorAll('.fdp-cell[data-step="' + s + '"]'),
                    function (c) { c.classList.add('is-cursor'); });
            }, Math.max(0, delay * 1000));
        }

        function start() {
            ensureCtx();
            step = 0;
            nextNoteTime = ctx.currentTime + 0.06;
            playing = true;
            play.textContent = 'Stop';
            timer = setInterval(scheduler, TIMER_MS);
        }

        function stop() {
            playing = false;
            play.textContent = 'Preview';
            clearInterval(timer);
            timer = null;
            [].forEach.call(grid.querySelectorAll('.fdp-cell.is-cursor'),
                function (c) { c.classList.remove('is-cursor'); });
        }

        play.addEventListener('click', function () { playing ? stop() : start(); });
        send.addEventListener('click', function () {
            if (opts.onLoad && current) opts.onLoad(current);
        });

        return {
            destroy: function () { stop(); root.innerHTML = ''; },
            getPattern: function () { return current; }
        };
    }

    window.SSKFunLab.drumPatterns = { mount: mount };
})();
