#!/usr/bin/env bash
# Bounce a multitrack session into 4 grouped 16-bar stems for the Fun Lab
# stem player. Groups/window are set below after analysing which bars each
# source stem is actually active in.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$HOME/Documents/USB Dump March 2025/Stems/ama rock - Marley Waters 112bpm stems"
OUT="$ROOT/assets/funlab/stems/ama-rock"
P="ama rock - Marley Waters 112bm"

BPM=112; BARS=16
BAR=$(python3 -c "print(4*60/$BPM)")
START=$(python3 -c "print(16*$BAR)")     # bar 17 - where the melody enters
LEN=$(python3 -c "print($BARS*$BAR)")

mkdir -p "$OUT"
# Two-pass: measure the summed peak, then scale to -1 dBFS.
# A fixed multiplier clipped 5.6% of the bass stem — these source stems sit
# around 0.02-0.05 RMS, so any one-size gain either distorts or is inaudible.
cut () {
  local name="$1"; shift
  local ins=() filts=() i=0
  for f in "$@"; do ins+=(-ss "$START" -t "$LEN" -i "$SRC/$f"); filts+=("[$i:a]"); i=$((i+1)); done
  local mix="${filts[*]}amix=inputs=$i:normalize=0[m]"

  # pass 1: what is the true peak of the summed group?
  local peak
  # volumedetect is what prints max_volume; without it the grep below finds
  # nothing and pipefail kills the script.
  peak=$(ffmpeg -nostdin -loglevel info -y "${ins[@]}" \
           -filter_complex "${mix};[m]volumedetect[v]" -map "[v]" \
           -f null - 2>&1 | grep -o 'max_volume: -*[0-9.]*' | tail -1 | awk '{print $2}' || true)
  peak=${peak:-0}
  local gain
  gain=$(python3 -c "print(max(0.0, $peak * -1 - 1.0))")   # land at -1 dBFS

  ffmpeg -nostdin -loglevel error -y "${ins[@]}" \
    -filter_complex "${mix};[m]volume=${gain}dB,afade=t=in:st=0:d=0.02,afade=t=out:st=$(python3 -c "print($LEN-0.05)"):d=0.05[o]" \
    -map "[o]" -ac 2 -ar 44100 -b:a 128k -map_metadata -1 "$OUT/$name.mp3"
  printf "  %-8s %5s KB  peak %6s dB -> +%s dB\n" "$name" "$(( $(stat -f%z "$OUT/$name.mp3") / 1024 ))" "$peak" "$gain"
}

echo "window: bar 17-32 (${LEN}s @ ${BPM}bpm)"
cut drums "$P 1-shakers.wav" "$P 2-AMER_ClapFx.wav"
cut perc "$P mw  Perc1_3.wav"
cut bass "$P 6-Sgidongo.wav"
cut melody "$P 9-YFB_140_melody_loop_hegel_Am.wav"

python3 - "$OUT" "$BPM" "$BARS" "$LEN" <<'PY'
import json,sys,os
out,bpm,bars,length = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), float(sys.argv[4])
json.dump({
  "id":"ama-rock","title":"Ama Rock","artist":"Marley Waters",
  "producer":"SSK Music","bpm":bpm,"bars":bars,
  "duration":round(length,4),"barSeconds":round(4*60/bpm,6),
  "stems":[{"id":s,"label":s.title(),"src":f"assets/funlab/stems/ama-rock/{s}.mp3"}
           for s in ("drums","perc","bass","melody")]
}, open(os.path.join(out,"manifest.json"),"w"), indent=2)
print("  manifest.json written")
PY
