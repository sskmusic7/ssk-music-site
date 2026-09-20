/**
 * SSK Fun Lab — Beat Machine
 *
 *   window.SSKFunLab.beatMachine.mount(el, { getAudioContext })
 *
 * 16-step sequencer over SSK's own one-shots.
 *
 * Scheduling is the thing that matters here. setInterval drifts audibly
 * inside a minute, so this uses the standard lookahead pattern: a coarse
 * timer wakes up every 25ms and schedules any step falling inside the next
 * 100ms directly against audioContext.currentTime. Playback timing is
 * therefore sample-accurate regardless of how badly the timer is throttled.
 */
(function () {
    'use strict';

    window.SSKFunLab = window.SSKFunLab || {};

    var MANIFEST = 'assets/funlab/oneshots/manifest.json';
    var STEPS = 16;
    var LOOKAHEAD = 0.1;   // seconds scheduled ahead
    var TICK = 25;         // ms between scheduler wake-ups

    // pattern lane -> one-shot. The cheat sheet has an openhat lane and we
    // have no open hat, so it borrows the shaker.
    var LANE_MAP = { openhat: 'shaker' };

    var ORDER = ['kick', 'snare', 'clap', 'hat', 'shaker', 'perc', 'logdrum'];
    var LABEL = {
        kick: 'Kick', snare: 'Snare', clap: 'Clap', hat: 'Hat',
        shaker: 'Shaker', perc: 'Perc', logdrum: 'Log Drum'
    };

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    function mount(root, opts) {
        opts = opts || {};
        root.classList.add('funlab-beat-machine');
        root.innerHTML = '';

        var ctx = null, buffers = {}, loaded = false;
        var grid = {}, tracks = [];
        var playing = false, timer = null;
        var step = 0, nextTime = 0, bpm = 96;
        var cells = {};

        ORDER.forEach(function (t) { grid[t] = new Array(STEPS).fill(0); });

        /* ---------- shell ---------- */
        var head = el('div', 'fbm-head');
        var title = el('div', 'fbm-title', 'Beat Machine');
        var status = el('div', 'fbm-status', 'loading kit…');
        head.appendChild(title);
        head.appendChild(status);

        var board = el('div', 'fbm-board');

        var foot = el('div', 'fbm-foot');
        var play = el('button', 'fbm-play', 'Play');
        play.type = 'button';
        play.disabled = true;

        var tempoWrap = el('label', 'fbm-tempo');
        var tempo = document.createElement('input');
        tempo.type = 'range';
        tempo.min = 60; tempo.max = 180; tempo.step = 1; tempo.value = bpm;
        tempo.setAttribute('aria-label', 'Tempo');
        var tempoVal = el('span', 'fbm-tempo-val', bpm + ' BPM');
        tempoWrap.appendChild(tempo);
        tempoWrap.appendChild(tempoVal);

        var clear = el('button', 'fbm-clear', 'Clear');
        clear.type = 'button';

        foot.appendChild(play);
        foot.appendChild(tempoWrap);
        foot.appendChild(clear);

        root.appendChild(head);
        root.appendChild(board);
        root.appendChild(foot);

        /* ---------- kit ---------- */
        fetch(MANIFEST)
            .then(function (r) {
                if (!r.ok) throw new Error('manifest ' + r.status);
                return r.json();
            })
            .then(function (m) {
                tracks = ORDER.filter(function (t) {
                    return m.oneshots.some(function (o) { return o.id === t; });
                });
                m.oneshots.forEach(function (o) { buffers[o.id] = { src: o.src }; });
                drawBoard();
                status.textContent = tracks.length + ' sounds · sliced from SSK sessions';
                play.disabled = false;
            })
            .catch(function (e) {
                status.textContent = "Couldn't load the kit.";
                console.error('[beat-machine]', e.message);
            });

        function drawBoard() {
            board.innerHTML = '';
            cells = {};

            var ruler = el('div', 'fbm-row fbm-ruler');
            ruler.appendChild(el('div', 'fbm-name', ''));
            for (var s = 0; s < STEPS; s++) {
                ruler.appendChild(el('div', 'fbm-beat' + (s % 4 === 0 ? ' is-downbeat' : ''),
                                     s % 4 === 0 ? String(s / 4 + 1) : ''));
            }
            board.appendChild(ruler);

            tracks.forEach(function (t) {
                var row = el('div', 'fbm-row');
                row.dataset.track = t;
                row.appendChild(el('div', 'fbm-name', LABEL[t] || t));
                cells[t] = [];
                for (var s = 0; s < STEPS; s++) {
                    var c = el('button', 'fbm-cell' + (s % 4 === 0 ? ' is-downbeat' : ''));
                    c.type = 'button';
                    c.dataset.step = s;
                    c.setAttribute('aria-label', LABEL[t] + ' step ' + (s + 1));
                    (function (track, idx, node) {
                        node.addEventListener('click', function () {
                            grid[track][idx] = grid[track][idx] ? 0 : 1;
                            node.classList.toggle('is-on', !!grid[track][idx]);
                            if (grid[track][idx]) preview(track);
                        });
                    })(t, s, c);
                    row.appendChild(c);
                    cells[t].push(c);
                }
                board.appendChild(row);
            });
            repaint();
        }

        function repaint() {
            tracks.forEach(function (t) {
                cells[t].forEach(function (c, i) {
                    c.classList.toggle('is-on', !!grid[t][i]);
                });
            });
        }

        /* ---------- audio ---------- */
        function ensureCtx() {
            if (!ctx) {
                ctx = opts.getAudioContext
                    ? opts.getAudioContext()
                    : new (window.AudioContext || window.webkitAudioContext)();
            }
            if (ctx.state === 'suspended') ctx.resume();
            return ctx;
        }

        function loadKit() {
            if (loaded) return Promise.resolve();
            return Promise.all(Object.keys(buffers).map(function (id) {
                return fetch(buffers[id].src)
                    .then(function (r) { return r.arrayBuffer(); })
                    .then(function (ab) {
                        return new Promise(function (res, rej) {
                            ctx.decodeAudioData(ab, function (b) {
                                buffers[id].buffer = b; res();
                            }, rej);
                        });
                    });
            })).then(function () { loaded = true; });
        }

        function hit(track, when) {
            var b = buffers[track] && buffers[track].buffer;
            if (!b) return;
            var src = ctx.createBufferSource();
            src.buffer = b;
            var g = ctx.createGain();
            g.gain.value = 0.85;
            src.connect(g).connect(ctx.destination);
            src.start(when);
        }

        function preview(track) {
            ensureCtx();
            loadKit().then(function () { hit(track, ctx.currentTime + 0.01); });
        }

        function scheduler() {
            var stepDur = (60 / bpm) / 4;             // 16th notes
            while (nextTime < ctx.currentTime + LOOKAHEAD) {
                var s = step;
                tracks.forEach(function (t) {
                    if (grid[t][s]) hit(t, nextTime);
                });
                paint(s, nextTime - ctx.currentTime);
                nextTime += stepDur;
                step = (step + 1) % STEPS;
            }
        }

        function paint(s, delay) {
            setTimeout(function () {
                board.querySelectorAll('.fbm-cell.is-cursor').forEach(function (c) {
                    c.classList.remove('is-cursor');
                });
                board.querySelectorAll('.fbm-cell[data-step="' + s + '"]').forEach(function (c) {
                    c.classList.add('is-cursor');
                });
            }, Math.max(0, delay * 1000));
        }

        play.addEventListener('click', function () {
            if (playing) { stop(); return; }
            ensureCtx();
            play.disabled = true;
            play.textContent = 'Loading…';
            loadKit().then(function () {
                step = 0;
                nextTime = ctx.currentTime + 0.06;
                playing = true;
                play.disabled = false;
                play.textContent = 'Stop';
                timer = setInterval(scheduler, TICK);
            }).catch(function (e) {
                play.disabled = false;
                play.textContent = 'Play';
                status.textContent = "Couldn't decode the kit.";
                console.error('[beat-machine]', e);
            });
        });

        function stop() {
            playing = false;
            play.textContent = 'Play';
            clearInterval(timer);
            timer = null;
            board.querySelectorAll('.fbm-cell.is-cursor').forEach(function (c) {
                c.classList.remove('is-cursor');
            });
        }

        tempo.addEventListener('input', function () {
            bpm = +tempo.value;
            tempoVal.textContent = bpm + ' BPM';
        });

        clear.addEventListener('click', function () {
            ORDER.forEach(function (t) { grid[t] = new Array(STEPS).fill(0); });
            repaint();
        });

        return {
            destroy: function () { stop(); root.innerHTML = ''; },

            /** Called by the Drum Pattern Cheat Sheet. */
            loadPattern: function (p) {
                ORDER.forEach(function (t) { grid[t] = new Array(STEPS).fill(0); });
                Object.keys(p.tracks || {}).forEach(function (lane) {
                    var target = LANE_MAP[lane] || lane;
                    if (!grid[target]) return;
                    p.tracks[lane].forEach(function (v, i) {
                        if (v && i < STEPS) grid[target][i] = 1;
                    });
                });
                if (p.bpm) {
                    bpm = Math.max(60, Math.min(180, p.bpm));
                    tempo.value = bpm;
                    tempoVal.textContent = bpm + ' BPM';
                }
                repaint();
                status.textContent = 'Loaded: ' + p.name;
                root.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };
    }

    window.SSKFunLab.beatMachine = { mount: mount };
})();
