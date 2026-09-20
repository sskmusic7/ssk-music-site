#!/usr/bin/env python3
"""
Slice drum one-shots out of SSK's own drum stems.

    python3 scripts/slice-oneshots.py

Sources are SSK productions, not sample packs. Sample-pack licences let you
use sounds in a track; they don't let you redistribute the raw one-shots,
which is what shipping them on a web page amounts to.

Two kinds of source:
  * already-isolated stems (the ama rock session has separate shaker / clap /
    perc tracks) — take the cleanest single hit
  * a mixed drum bounce (Retrospect) — find onsets that are ISOLATED, i.e.
    quiet before and nothing else within ~140ms, then classify by spectrum so
    a kick doesn't get exported as a snare

Output: assets/funlab/oneshots/<name>.wav — mono, 44.1k, trimmed and faded.
"""

import json
import os
import sys

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets/funlab/oneshots")

HOME = os.path.expanduser("~")
AMA = os.path.join(HOME, "Documents/USB Dump March 2025/Stems/"
                         "ama rock - Marley Waters 112bpm stems")
RETRO = os.path.join(HOME, "Documents/USB Dump March 2025/Projects 3/"
                           "retrospect cleaned/Audio/Retrospect - Prod by SSK.wav_drums.wav")

SR = 44100
ISOLATION = 0.14      # seconds that must be clear either side of a usable onset


def load_mono(path, limit_s=None):
    x, sr = sf.read(path, dtype="float32",
                    frames=int(limit_s * SR) if limit_s else -1)
    if x.ndim > 1:
        x = x.mean(axis=1)
    return x, sr


def onsets(x, sr, thresh=0.25):
    """Energy-based onset detection on a 5ms hop."""
    hop = int(sr * 0.005)
    env = np.array([np.abs(x[i:i + hop]).max() for i in range(0, len(x) - hop, hop)])
    if env.max() <= 0:
        return []
    env = env / env.max()
    d = np.diff(env, prepend=env[0])
    peaks = []
    for i in range(1, len(d) - 1):
        if env[i] > thresh and d[i] > 0 and d[i + 1] <= 0:
            peaks.append(i * hop)
    return peaks


def spectrum_bands(seg, sr):
    n = len(seg)
    if n < 256:
        return 0, 0, 0
    X = np.abs(np.fft.rfft(seg * np.hanning(n))) ** 2
    fr = np.fft.rfftfreq(n, 1 / sr)
    tot = X.sum() + 1e-12
    return (X[fr < 150].sum() / tot,
            X[(fr >= 150) & (fr < 2500)].sum() / tot,
            X[fr >= 2500].sum() / tot)


def classify(low, mid, high):
    if low > 0.55:
        return "kick"
    if high > 0.65:
        return "hat"
    if mid > 0.40 and high > 0.20:
        return "snare"
    if mid > 0.45:
        return "perc"
    return None


def export(name, seg, sr, length_s):
    seg = seg[: int(length_s * sr)].astype(np.float32)
    if seg.size == 0:
        return False
    peak = float(np.abs(seg).max())
    if peak < 1e-4:
        return False
    seg = seg / peak * 0.89                      # headroom, no clipping
    fade = min(len(seg), int(sr * 0.006))
    seg[:fade] *= np.linspace(0, 1, fade)        # kill the click on the front
    tail = min(len(seg), int(sr * 0.03))
    seg[-tail:] *= np.linspace(1, 0, tail)
    os.makedirs(OUT, exist_ok=True)
    sf.write(os.path.join(OUT, name + ".wav"), seg, sr, subtype="PCM_16")
    return True


def from_isolated(path, name, length_s):
    """A stem that already contains only one instrument: take its loudest hit."""
    if not os.path.exists(path):
        print(f"  {name:<9} SKIP  missing source")
        return False
    x, sr = load_mono(path)
    on = onsets(x, sr, thresh=0.35)
    if not on:
        print(f"  {name:<9} SKIP  no onset found")
        return False
    best = max(on, key=lambda p: np.abs(x[p:p + int(sr * 0.05)]).max())
    ok = export(name, x[max(0, best - int(sr * 0.002)):], sr, length_s)
    print(f"  {name:<9} {'ok' if ok else 'FAIL'}    from {os.path.basename(path)[:44]}")
    return ok


def from_mixed(path, wanted, length_s, scan_s=120):
    """A mixed drum bounce: only accept onsets with silence either side."""
    if not os.path.exists(path):
        print("  mixed source missing:", path)
        return {}
    x, sr = load_mono(path, limit_s=scan_s)
    on = onsets(x, sr, thresh=0.22)
    gap = int(ISOLATION * sr)
    found = {}

    for p in on:
        if all(k in found for k in wanted):
            break
        pre = x[max(0, p - gap):p]
        if pre.size and np.abs(pre).max() > 0.18:
            continue                                   # something else ringing
        nxt = [q for q in on if q > p]
        if nxt and (nxt[0] - p) < gap:
            continue                                   # next hit too close
        seg = x[p:p + int(sr * 0.25)]
        kind = classify(*spectrum_bands(seg, sr))
        if kind in wanted and kind not in found:
            found[kind] = p
            export(kind, x[max(0, p - int(sr * 0.002)):], sr, length_s[kind])
            print(f"  {kind:<9} ok    isolated hit at {p / sr:7.2f}s")

    for k in wanted:
        if k not in found:
            print(f"  {k:<9} MISS  no isolated hit in first {scan_s}s")
    return found


def main():
    print("isolated stems (ama rock):")
    made = []
    for src, name, ln in [
        ("ama rock - Marley Waters 112bm 1-shakers.wav",   "shaker", 0.28),
        ("ama rock - Marley Waters 112bm 2-AMER_ClapFx.wav", "clap",  0.35),
        ("ama rock - Marley Waters 112bm mw  Perc1_3.wav", "perc",   0.35),
        ("ama rock - Marley Waters 112bm 6-Sgidongo.wav",  "logdrum", 0.60),
    ]:
        if from_isolated(os.path.join(AMA, src), name, ln):
            made.append(name)

    print("\nmixed bounce (Retrospect):")
    got = from_mixed(RETRO, {"kick", "snare", "hat"},
                     {"kick": 0.45, "snare": 0.35, "hat": 0.14})
    made += list(got.keys())

    manifest = {
        "source": "SSK Music own productions (ama rock stems, Retrospect drum bounce)",
        "sampleRate": SR,
        "oneshots": [{"id": n, "src": f"assets/funlab/oneshots/{n}.wav"} for n in sorted(set(made))],
    }
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)

    print(f"\n{len(manifest['oneshots'])} one-shot(s) -> assets/funlab/oneshots")
    for o in manifest["oneshots"]:
        p = os.path.join(ROOT, o["src"])
        print(f"  {o['id']:<9} {os.path.getsize(p) // 1024:>4} KB")


if __name__ == "__main__":
    sys.exit(main())
