#!/usr/bin/env python3
"""
Build the Fun Lab one-shot kit.

The first kit was sliced out of SSK's own session stems, which meant every
hit carried bleed from whatever else was playing in that bar — a kick with
hat on its tail is unusable in a sequencer, because the bleed retriggers on
every step. These come from isolated one-shots instead: the BigHeadz kit
(KBH) for kicks, snares, claps, hats and 808s, an amapiano pack for
percussion, and the SSK-1 shakers. Measured tail-to-total RMS on the KBH
hits is ~0.00, i.e. they decay to silence on their own.

The log drums are the one exception — they're synthesised, because an
amapiano log drum IS a synth patch (the pack ships them as FL presets, not
audio). A sine with a fast pitch dip gives a clean, bleed-free hit by
construction.

Everything is trimmed to the first transient, peak-normalised to -1 dBFS, and
given a short fade-out so tails don't click when the buffer ends.
"""
import json, os, sys, tempfile, zipfile
import numpy as np
import soundfile as sf

SR = 44100
OUT = "assets/funlab/oneshots"
USB = "/Users/sskmusic/Documents/USB Dump March 2025"
MAC = USB + "/Macbook Documents run from here"
PACK = MAC + "/Downloads/Sho Fav - Amapiano Sample Pack"
SAMP = USB + "/Aff 5 maybe/Samples"
SSK1 = MAC + "/Downloads/SSK-1/Shakers"

# The BigHeadz kit ships as a zip. Extract it once to a temp dir rather than
# unpacking 6.6MB into the repo — only the finished one-shots get committed.
KBH_ZIP = MAC + "/Zips/KBH_drums-20240408T231401Z-001.zip"
KBH = os.path.join(tempfile.gettempdir(), "kbh_drums")
if os.path.exists(KBH_ZIP) and not os.path.isdir(KBH + "/KBH_drums"):
    with zipfile.ZipFile(KBH_ZIP) as z:
        z.extractall(KBH)
KBH += "/KBH_drums"

def env(n, a=0.002, d=0.25, curve=4.0):
    t = np.arange(n) / SR
    atk = np.clip(t / a, 0, 1)
    dec = np.exp(-curve * t / d)
    return atk * dec

def synth_kick(f0=120, f1=45, dur=0.55, click=0.4, drop=0.030):
    n = int(SR * dur); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / drop)          # pitch envelope
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, dur, 4.5)
    tn = int(SR * 0.004)                             # transient click
    x[:tn] += click * np.random.RandomState(7).uniform(-1, 1, tn) * np.linspace(1, 0, tn)
    return x

def synth_logdrum(note=55.0, dur=0.45):
    """Sine body, fast pitch dip, plus a woody second partial."""
    n = int(SR * dur); t = np.arange(n) / SR
    f = note * (1 + 1.4 * np.exp(-t / 0.018))        # the characteristic dip
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, dur, 5.0)
    wood = 0.18 * np.sin(2 * np.pi * np.cumsum(f * 2.7) / SR) * env(n, 0.001, 0.05, 8.0)
    return body + wood

def load(path):
    x, sr = sf.read(path, dtype="float32")
    if x.ndim > 1:
        x = x.mean(1)
    if sr != SR:
        idx = np.linspace(0, len(x) - 1, int(len(x) * SR / sr))
        x = np.interp(idx, np.arange(len(x)), x).astype("float32")
    return x

# Per-lane tail budget. Sub-bass needs room; a hat does not.
MAX_DUR = {"logdrum": 1.8, "kick": 1.2, "openhat": 0.7}

def finish(x, max_dur=1.0):
    x = np.asarray(x, dtype="float32")
    above = np.where(np.abs(x) > 0.002)[0]           # trim to first transient
    if len(above):
        x = x[max(0, above[0] - 32):]
    x = x[:int(SR * max_dur)]
    fade = min(int(SR * 0.006), len(x) // 4)         # kill the end click
    if fade > 0:
        x[-fade:] *= np.linspace(1, 0, fade)
    pk = np.max(np.abs(x))
    if pk > 0:
        x = x * (10 ** (-1.0 / 20) / pk)             # -1 dBFS
    return x

# id -> list of (label, source). str = file, callable = synth.
KIT = {
    "kick": [
        ("BH tight",   f"{KBH}/KBH_kicks/KBH_kick_bighead_05.wav"),
        ("BH punch",   f"{KBH}/KBH_kicks/KBH_kick_bighead_02.wav"),
        ("BH sub",     f"{KBH}/KBH_kicks/KBH_kick_bighead_04.wav"),
        ("808",        f"{SAMP}/Basic 808 Kick.wav"),
        ("Synth",      lambda: synth_kick(160, 52, 0.38, 0.55, 0.018)),
    ],
    "snare": [
        ("BH gucci",   f"{KBH}/KBH_snares/KBH_snare_gucci_gang.wav"),
        ("BH 07",      f"{KBH}/KBH_snares/KBH_snare_bighead_07.wav"),
        ("BH flexer",  f"{KBH}/KBH_snares/KBH_snare_clap_youngest_flexer.wav"),
        ("Acoustic",   f"{PACK}/Percussion/Sd022A-EQ Snare.wav"),
        ("808",        f"{SAMP}/Basic 808 Snare.wav"),
    ],
    "clap": [
        ("BH gucci",   f"{KBH}/KBH_claps/KBH_clap_gucci_gang.wav"),
        ("Amapiano",   f"{PACK}/Claps/KDM Clap (1).wav"),
        ("Short",      f"{PACK}/Claps/KDM Clap (2).wav"),
        ("808",        f"{SAMP}/Basic 808 Clap.wav"),
    ],
    "hat": [
        ("BH gucci",   f"{KBH}/KBH_hihats/KBH_hihat_closed/KBH_hihat_closed_gucci_gang.wav"),
        ("BH 02",      f"{KBH}/KBH_hihats/KBH_hihat_closed/KBH_hihat_closed_bighead_02.wav"),
        ("BH 04",      f"{KBH}/KBH_hihats/KBH_hihat_closed/KBH_hihat_closed_bighead_04.wav"),
        ("Closed",     f"{SAMP}/Basic 808 HiHat.wav"),
    ],
    # Amapiano's hat is an OPEN hat on the offbeat — the "tss" between the
    # kicks. It had no lane of its own, so that pattern was being played on a
    # closed hat and losing the sound the genre is built on.
    "openhat": [
        ("Tight",      f"{PACK}/Open hats/KDM Open Hat (5).wav"),
        ("Mid",        f"{PACK}/Open hats/KDM Open Hat (29).wav"),
        ("Long",       f"{PACK}/Open hats/KDM Open Hat (23).wav"),
        ("Wide",       f"{PACK}/Open hats/KDM Open Hat (19).wav"),
    ],
    "shaker": [
        ("Shaker",     f"{SSK1}/Shaker (4).wav"),
        ("Long",       f"{SSK1}/Shaker 09.aif"),
        ("Soft",       f"{SSK1}/Shaker 14.aif"),
    ],
    "perc": [
        ("Conga",      f"{PACK}/Conga/KDM conga 2.wav"),
        ("Rim",        f"{PACK}/RIMS/KDM Rim (5).wav"),
        ("Bongo",      f"{PACK}/Percussion/Bongo 3.wav"),
        ("Cowbell",    f"{PACK}/Percussion/Cb037A-EQ Cowbell.wav"),
    ],
    # Log drums and 808s are both tuned sub-percussion, so they share a lane.
    "logdrum": [
        ("Log low",    lambda: synth_logdrum(49.0, 0.50)),
        ("Log mid",    lambda: synth_logdrum(65.4, 0.42)),
        ("Log high",   lambda: synth_logdrum(82.4, 0.36)),
        ("BH 808 C#",  f"{KBH}/KBH_808s/KBH_808_bighead_05_C#.wav"),
        ("BH 808 E",   f"{KBH}/KBH_808s/KBH_808_bighead_tracy_E.wav"),
    ],
}

os.makedirs(OUT, exist_ok=True)
manifest, missing = [], []
for lane, variants in KIT.items():
    entry = {"id": lane, "variants": []}
    for i, (label, src) in enumerate(variants):
        if callable(src):
            x = src()
        else:
            if not os.path.exists(src):
                missing.append(src); continue
            x = load(src)
        x = finish(x, MAX_DUR.get(lane, 1.0))
        name = f"{lane}.wav" if i == 0 else f"{lane}-{i}.wav"
        sf.write(f"{OUT}/{name}", x, SR, subtype="PCM_16")
        entry["variants"].append({
            "label": label,
            "src": f"{OUT}/{name}",
            "ms": round(len(x) / SR * 1000),
        })
    if entry["variants"]:
        entry["src"] = entry["variants"][0]["src"]
        manifest.append(entry)

with open("assets/funlab/oneshots/manifest.json", "w") as f:
    json.dump({
        "note": "Isolated one-shots — no bleed. Log drums and 808s synthesised.",
        "oneshots": manifest,
    }, f, indent=2)

for e in manifest:
    print(f"  {e['id']:8} " + ", ".join(
        f"{v['label']}({v['ms']}ms)" for v in e["variants"]))
if missing:
    print("\nMISSING:", *missing, sep="\n  "); sys.exit(1)
print(f"\n{sum(len(e['variants']) for e in manifest)} samples across {len(manifest)} lanes")
