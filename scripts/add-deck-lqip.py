#!/usr/bin/env python3
"""
Bake a low-quality image placeholder (LQIP) into data/deck.json.

The carousel showed a black frame for a beat or two when you landed on a
slide whose artwork was still downloading. Adding a shimmer didn't help,
because the frame behind the slides is #060d18 and the shimmer sat on a navy
gradient — one near-black box replaced by another.

The real fix is to have something to show immediately. Each slide gets a 24px
wide, blurred JPEG inlined as a data URI: ~600 bytes, zero extra requests, so
it paints on the first frame. The full image fades in on top. There is no
moment where the slide is empty.

Cheap by design: 21 slides adds ~15KB to deck.json, against 117KB for a
single full slide.
"""
import base64, io, json, os
from PIL import Image, ImageFilter

DECK = "data/deck.json"
WIDTH = 24

data = json.load(open(DECK))
slides = data if isinstance(data, list) else data.get("slides", [])

total = 0
for s in slides:
    src = (s.get("fallback") or "").split("?")[0]
    if not src or not os.path.exists(src):
        print("  skip (missing):", src)
        continue

    im = Image.open(src).convert("RGB")
    h = max(1, round(WIDTH * im.height / im.width))
    im = im.resize((WIDTH, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))

    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=42, optimize=True)
    b = buf.getvalue()
    s["lqip"] = "data:image/jpeg;base64," + base64.b64encode(b).decode("ascii")
    total += len(s["lqip"])

json.dump(data, open(DECK, "w"), indent=2)
print(f"  {len(slides)} slides · {total // 1024} KB of placeholders "
      f"({total // max(len(slides),1)} bytes each)")
