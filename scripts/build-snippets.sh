#!/usr/bin/env bash
#
# Cut short web previews from SSK's own productions for the deck disks.
#
#   scripts/build-snippets.sh [--start 60] [--len 15]
#
# Source is data/snippet-map.tsv — one row per deck slide:
#
#   <slide-order><TAB><absolute source path><TAB><start seconds>
#
# Output: assets/audio/snippets/slide-NN.mp3  (mono, 96kbps, ~180KB)
# and the `audio` field of each slide in data/deck.json is filled in.
#
# Source material is SSK's own beat library (~/Documents/Organised Beats),
# not ripped audio. These are SSK productions being used on SSK's own site.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAP="$ROOT/data/snippet-map.tsv"
OUT="$ROOT/assets/audio/snippets"
DECK="$ROOT/data/deck.json"

LEN=15
DEFAULT_START=60
FADE=1.2

while [[ $# -gt 0 ]]; do
  case "$1" in
    --len)   LEN="$2";           shift 2 ;;
    --start) DEFAULT_START="$2";  shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 1 ;;
  esac
done

command -v ffmpeg >/dev/null || { echo "ffmpeg not found" >&2; exit 1; }
[[ -f "$MAP" ]] || { echo "missing $MAP" >&2; exit 1; }

mkdir -p "$OUT"
made=0

while IFS=$'\t' read -r order src start; do
  # skip blanks and comments
  [[ -z "${order// }" || "${order:0:1}" == "#" ]] && continue
  start="${start:-$DEFAULT_START}"

  if [[ ! -f "$src" ]]; then
    printf '  slide %-3s SKIP  missing: %s\n' "$order" "$src"
    continue
  fi

  dest="$OUT/$(printf 'slide-%02d.mp3' "$order")"
  fade_out=$(awk -v l="$LEN" -v f="$FADE" 'BEGIN{printf "%.2f", l-f}')

  # dynaudnorm, not loudnorm: loudnorm analyses the stream and took minutes
  # per file here. dynaudnorm is single-pass and finishes in ~2s, which is
  # plenty for a 15s web preview.
  ffmpeg -nostdin -loglevel error -y \
    -ss "$start" -t "$LEN" -i "$src" \
    -af "afade=t=in:st=0:d=${FADE},afade=t=out:st=${fade_out}:d=${FADE},dynaudnorm=f=250:g=15" \
    -ac 1 -ar 44100 -b:a 96k -map_metadata -1 \
    "$dest"

  kb=$(( $(stat -f%z "$dest" 2>/dev/null || stat -c%s "$dest") / 1024 ))
  printf '  slide %-3s ok    %4s KB  <- %s\n' "$order" "$kb" "$(basename "$src")"
  made=$((made+1))
done < "$MAP"

echo
echo "$made snippet(s) -> assets/audio/snippets"

# point deck.json at whatever actually exists
python3 - "$DECK" "$OUT" <<'PY'
import json, os, sys
deck_path, out_dir = sys.argv[1], sys.argv[2]
with open(deck_path) as fh:
    deck = json.load(fh)

linked = 0
for s in deck["slides"]:
    rel = f"assets/audio/snippets/slide-{s['order']:02d}.mp3"
    if os.path.exists(os.path.join(out_dir, os.path.basename(rel))):
        s["audio"] = rel
        linked += 1
    else:
        s["audio"] = None

with open(deck_path, "w") as fh:
    json.dump(deck, fh, indent=2)
print(f"deck.json: {linked} slide(s) now have audio")
PY
