#!/usr/bin/env python3
"""Pick the hook: the highest-energy 15s window in each track, snapped away
from the intro/outro. Writes data/snippet-map.tsv for build-snippets.sh."""
import os, sys, subprocess, numpy as np, soundfile as sf

SRC = os.path.expanduser("~/Downloads/sskk_prod")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = "/private/tmp/claude-501/-Users-sskmusic/b1c734ed-f8b3-4776-9345-f19d00a8d3a9/scratchpad"
LEN = 15.0

# deck slide order -> source filename
MAP = {
    7:  "B Young - Been Wavey.mp3",
    8:  "Alicai Harley - Proper Paper.mp3",
    9:  "Tion Wayne - Kenny Allstar Freestyle.mp3",
    10: "Ambush x SP Montiz - Extra.mp3",
    11: "8CYN x Dre Six - Parle.mp3",
    12: "Marley Waters - Twin Flame.mp3",
    13: "Mowgs - Erdz Boy.mp3",
    14: "Enigma - Snowing.mp3",
    15: "Aden x Asme - Skiner.mp3",
    16: "Shainny - Tu Tentacion.mp3",
}

rows = []
for order, fname in sorted(MAP.items()):
    src = os.path.join(SRC, fname)
    if not os.path.exists(src):
        print(f"  slide {order:<3} MISSING {fname}"); continue

    wav = os.path.join(TMP, f"hook{order}.wav")
    subprocess.run(["ffmpeg","-nostdin","-loglevel","error","-y","-i",src,
                    "-ac","1","-ar","22050",wav], check=True)
    x, sr = sf.read(wav, dtype="float32")
    dur = len(x)/sr

    # skip the first 20s and last 20s, then slide a 15s window
    lo, hi = int(20*sr), int(max(20*sr+1, len(x)-20*sr-LEN*sr))
    win = int(LEN*sr); best, best_e = 20.0, -1
    for st in range(lo, hi, int(sr*2)):          # 2s resolution
        seg = x[st:st+win]
        if len(seg) < win: break
        e = float(np.sqrt(np.mean(seg**2)))
        if e > best_e: best_e, best = e, st/sr
    os.remove(wav)
    rows.append((order, src, round(best,1)))
    print(f"  slide {order:<3} {fname[:40]:<42} hook @ {best:6.1f}s / {dur:6.1f}s")

with open(os.path.join(ROOT,"data/snippet-map.tsv"),"w") as fh:
    fh.write("# deck slide -> source -> start seconds (hook auto-detected)\n")
    fh.write("# regenerate with: python3 scripts/find-hooks.py\n")
    for o,s,st in rows:
        fh.write(f"{o}\t{s}\t{st}\n")
print(f"\nwrote {len(rows)} rows to data/snippet-map.tsv")
