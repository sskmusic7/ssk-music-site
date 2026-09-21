#!/usr/bin/env python3
"""
Cut the African Dream session bounces into a 16-bar loop for the Fun Lab
stem player.

Tempo was worth pinning down properly. Peak-picking kick onsets suggested
~120 BPM, but that estimate had a mean error of ~120ms against every
candidate grid — a quarter of a beat, i.e. it was fitting noise. Spectral-flux
autocorrelation on the kicks, snares and master all land sharply on 98 BPM,
and 240s of audio divides into exactly 98 bars at that tempo, which settles
it. Getting this wrong by even half a BPM would drift the loop point by a
few hundred ms over 16 bars and the loop would audibly stumble.

The window (bars 49-64) is chosen by measuring per-bar RMS of every stem and
taking the 16-bar run where the least-present stem is most active, with a
nudge toward 8-bar phrase boundaries so the loop starts where the music does.

Synths.wav is excluded: it's a silent bounce (-240 dBFS, and 5s shorter than
every other file). SSK Tag.wav is excluded too - it's the producer tag, active
in 3 bars of 98.
"""
import json, os, subprocess, sys

SRC = "/Users/sskmusic/Downloads/Bounces 2"
OUT = "assets/funlab/stems/african-dream"
BPM = 98.0
BAR = 4 * 60 / BPM              # 2.448980s
BARS = 16
START = 117.571                 # bar 49
LEN = BARS * BAR                # 39.1837s

# lane id -> (label, source files to sum)
GROUPS = [
    ("kick",   "Kick",   ["Kicks.wav"]),
    ("snare",  "Snare",  ["Snares.wav"]),
    ("hats",   "Hats",   ["Hats.wav"]),
    ("808",    "808",    ["808s.wav"]),
    ("sample", "Sample", ["Sample.wav"]),
    ("sounds", "Sounds", ["Sounds_1.wav"]),
]

def run(args):
    return subprocess.run(args, capture_output=True, text=True)

def peak_db(inputs, mix):
    """Pass 1: true peak of the summed group, so we can scale it exactly."""
    r = run(["ffmpeg", "-nostdin", "-loglevel", "info", "-y", *inputs,
             "-filter_complex", f"{mix};[m]volumedetect[v]", "-map", "[v]",
             "-f", "null", "-"])
    for line in reversed(r.stderr.splitlines()):
        if "max_volume:" in line:
            return float(line.split("max_volume:")[1].replace("dB", "").strip())
    return 0.0

os.makedirs(OUT, exist_ok=True)
stems, missing = [], []
for lane, label, files in GROUPS:
    paths = [f"{SRC}/{f}" for f in files]
    for p in paths:
        if not os.path.exists(p):
            missing.append(p)
    if missing:
        continue

    inputs, filts = [], []
    for i, p in enumerate(paths):
        inputs += ["-ss", str(START), "-t", str(LEN), "-i", p]
        filts.append(f"[{i}:a]")
    mix = "".join(filts) + f"amix=inputs={len(paths)}:normalize=0[m]"

    gain = max(0.0, -peak_db(inputs, mix) - 1.0)     # land at -1 dBFS

    # 3ms fades only. Longer ones (the ama-rock script used 20/50ms) put an
    # audible dip at the loop point, since Web Audio wraps sample-accurately.
    out = f"{OUT}/{lane}.mp3"
    r = run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", *inputs,
             "-filter_complex",
             f"{mix};[m]volume={gain}dB,"
             f"afade=t=in:st=0:d=0.003,afade=t=out:st={LEN - 0.003}:d=0.003[o]",
             "-map", "[o]", "-ac", "2", "-ar", "44100", "-b:a", "128k",
             "-map_metadata", "-1", out])
    if r.returncode != 0:
        print(r.stderr[-400:]); sys.exit(1)

    kb = os.path.getsize(out) // 1024
    print(f"  {label:7} {kb:4d} KB   peak {-gain - 1.0:6.1f} dB -> +{gain:.1f} dB")
    stems.append({"id": lane, "label": label, "src": out})

if missing:
    print("MISSING:", *missing, sep="\n  "); sys.exit(1)

with open(f"{OUT}/manifest.json", "w") as f:
    json.dump({
        "id": "african-dream",
        "title": "The African Dream",
        "artist": "SSK Music",
        "producer": "SSK Music",
        "bpm": BPM,
        "bars": BARS,
        "duration": round(LEN, 4),
        "barSeconds": round(BAR, 6),
        "stems": stems,
    }, f, indent=2)
print(f"\n{len(stems)} stems · {BARS} bars @ {BPM} BPM · {LEN:.2f}s · "
      f"{sum(os.path.getsize(s['src']) for s in stems) // 1024} KB total")
