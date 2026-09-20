# SSK Fun Lab — build spec

**Purpose:** hand this to Aisha Coding Suite / Gemini to build each tool as a
standalone widget. Build to the contract below and I can drop it into
`sskmusic.com` without rewriting it.

Everything here comes from the original brief:

> Cool shit section — stem replicator (plays 16 bar loops), beat machine,
> drum pattern cheat sheet, rhyme finder. Type Beat MK1 (bot that searches
> for certain type beats). Support videos. Beat packs. Legacy (care packages,
> Lockdown Challenge). Blog written on demand via a bot.

---

## Non-negotiable contract

The site is **static vanilla HTML/CSS/JS on Cloudflare Pages**. No build step,
no bundler, no framework runtime. So:

| Rule | Why |
|---|---|
| **One folder per tool**: `assets/js/funlab/<tool>.js` + `assets/css/funlab/<tool>.css` | keeps them independent and droppable |
| **No React / Vue / Svelte / jQuery** | nothing on the page ships a framework; adding one for a widget doubles page weight |
| **No build step, no npm imports** | Cloudflare Pages publishes the repo root as-is |
| **Mount into one element, don't own the page**: `window.SSKFunLab.<tool>.mount(el, opts)` | lets me place them anywhere |
| **No global CSS.** Scope everything under `.funlab-<tool>` | the site has a global `img{height:auto!important}` that has already broken two things |
| **Audio: Web Audio API**, one shared `AudioContext`, created on first user gesture | browsers block autoplay; a second context stutters |
| **Assets by relative path** under `assets/funlab/<tool>/` | no CDNs — CSP and offline |
| **Must work at 390px wide** and respect `prefers-reduced-motion` | over half the traffic is mobile |

### Mount contract

```js
window.SSKFunLab = window.SSKFunLab || {};
window.SSKFunLab.beatMachine = {
  mount(el, opts = {}) { /* render into el */ return { destroy() {} }; }
};
```

`opts.audioContext` will be passed in — **use it if present**, only create one
if it's missing.

---

## Priority order

Quickest real win first. **1 and 2 are the ones to start on.**

### 1. Rhyme Finder — easiest, no assets
Type a word or line, get rhymes back.

- API: `https://api.datamuse.com/words?rel_rhy=<word>` — free, no key, CORS-open
- Tabs: **Perfect** (`rel_rhy`), **Near** (`rel_nry`), **Sounds like** (`sl`)
- Take the **last word** of a typed line, not the whole line
- Show syllable count (`?md=s` returns it) so bars can be matched
- Click a result to copy it
- Handle the API being down without breaking the page

No audio, no assets. A competent model builds this in one pass.

### 2. Drum Pattern Cheat Sheet — static data + grid
A reference of classic patterns, 16 steps x 4-6 tracks.

- Genres to cover: **boom bap, drill, afroswing, amapiano, trap, dancehall,
  UK garage, afrobeats**
- Data shape (put it in `data/funlab/drum-patterns.json`):

```json
{
  "id": "amapiano",
  "name": "Amapiano",
  "bpm": 112,
  "steps": 16,
  "tracks": {
    "kick":  [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0],
    "snare": [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    "hat":   [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
    "shaker":[1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]
  },
  "note": "The log drum carries the groove — leave space on the 2 and 4."
}
```

Read-only grid. **"Load into Beat Machine"** button hands the pattern to tool 3.

### 3. Beat Machine — 16-step sequencer
- 16 steps x 8 tracks, tap to toggle, tempo 60-180 BPM
- **Scheduling: lookahead, not `setInterval`.** Schedule ~100ms ahead against
  `audioContext.currentTime` using `AudioBufferSourceNode.start(when)`.
  `setInterval` drifts audibly within a minute — this is the one thing that
  will make it feel amateur.
- Samples: `assets/funlab/beat-machine/*.wav` — short one-shots, mono, 44.1kHz.
  **SSK supplies these**, 8 files: kick, snare, clap, closed hat, open hat,
  rim, tom, perc
- Per-track mute + volume; master volume
- Preset load from tool 2; export pattern as JSON to clipboard

**Acceptance test:** run at 140 BPM for 3 minutes and confirm it hasn't drifted
against a stopwatch. If it has, the scheduler is wrong.

### 4. Stem Replicator — 16-bar loop player
Four stems of the same track, in sync, mute/solo to hear the arrangement.

- Stems: drums / bass / melody / vocal, 16 bars each, **exactly the same
  length and BPM** — `assets/funlab/stems/<track>/<stem>.mp3`
- **SSK supplies the stems.** One track is enough to ship.
- All four decode into buffers, start on the same `when` timestamp, loop
  seamlessly (`loop = true`, `loopEnd` at the exact bar boundary)
- Mute/solo must **not** restart playback — gain node per stem, ramp to 0
- Show a bar counter 1-16
- Preload with a progress indicator; four stems is a few MB

**Acceptance test:** mute and unmute a stem 20 times mid-playback; it must stay
in sync.

### 5. Type Beat MK1 — starts as a section, later its own page
Search for type beats by artist.

There are already two projects for this — **do not rebuild them**:
- `/Users/sskmusic/Type beat/`
- `/Users/sskmusic/Automated Youtube Beat System/`

Build **only the front end**: a search box that calls one endpoint and renders
results. Assume:

```
GET /api/typebeat?q=<artist>
-> { "results": [ { "title", "artist", "url", "thumbnail", "bpm", "key" } ] }
```

I'll wire that endpoint to the existing projects. Ship it against a stubbed
JSON file so it can be built and tested without the backend.

---

## Not Fun Lab — separate pages, lower priority

These were in the brief but aren't games:

- **Videos page** (`videos.html`) — tutorial library with the four categories:
  1-min explainers, Three Things You Need To Know, What I Wish I Knew,
  2027 Cheat Sheets. Feeds off a YouTube playlist, reusing
  `scripts/build-discography.mjs`.
- **Blog** (`blog.html`) — on demand, not scheduled. Mirrors the BigHeadz
  pattern: one JSON per post in `data/blog/posts/<slug>.json`, a bot writes to
  `incoming/`, a script promotes and pushes, Cloudflare rebuilds.
  See `/Users/sskmusic/bigheadz-global/BLOG-AUTOMATION.md`.
- **Beat packs** — `data/beat-packs.json` -> grid with preview + buy link.
- **Legacy** — care packages and the Lockdown Challenge, using deck p25
  (Philanthropy).
- **Streaming bar** — sticky bottom BeatStars-style player. Shares the single
  `Audio` element the deck disk already uses.

---

## What SSK needs to supply

| For | What | Blocking? |
|---|---|---|
| Beat Machine | 8 drum one-shots (wav, mono) | yes |
| Stem Replicator | 4 stems of one track, 16 bars, same BPM | yes |
| Deck disks | full tracks to cut 15s hooks from | yes (disks are silent) |
| Type Beat MK1 | confirm which repo is the live one | no, stub first |

Tools 1 and 2 need **nothing** — they can be built today.

---

## How to hand it back

Per tool, one folder:

```
funlab-<tool>/
├── <tool>.js        # window.SSKFunLab.<tool>.mount(el, opts)
├── <tool>.css       # everything scoped under .funlab-<tool>
├── demo.html        # standalone page proving it works
└── README.md        # what it needs, what opts it takes
```

If `demo.html` opens and works from `file://` with no server, it will drop
straight into the site.
