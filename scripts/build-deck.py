#!/usr/bin/env python3
"""
Render the SSK pitch deck PDF into web-ready slides + data/deck.json.

    python3 scripts/build-deck.py [--pdf PATH] [--width 1600]

Skips the blank/divider/outro pages (2, 3, 9, 21, 26, 27, 28) so the carousel
is 21 content slides rather than 28 with dead stops in the middle.

Writes:
    assets/deck/slide-NN.webp   (primary, ~1600px wide)
    assets/deck/slide-NN.jpg    (fallback for old Safari)
    assets/deck/thumb-NN.webp   (dot/preview strip)
    data/deck.json
"""

import argparse
import io
import json
import os
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("PyMuPDF missing.  pip install pymupdf")

from PIL import Image

DEFAULT_PDF = (
    "/Users/sskmusic/Documents/"
    "Final ssk deck (1920 x 1080 px).pdf (210 x 148 mm) (6).pdf"
)

# 1-indexed page -> slide metadata.  Pages not listed are skipped
# (2 black, 3 contents, 9 + 21 logo dividers, 26-28 outro/scripture/logo).
SLIDES = {
    1:  {"title": "SSK Music",            "kind": "cover"},
    4:  {"title": "About SSK Music",      "kind": "about"},
    5:  {"title": "SSK Music Beats",      "kind": "about"},
    6:  {"title": "Netflix Sync",         "kind": "credential"},
    7:  {"title": "Credentials",          "kind": "credential"},
    8:  {"title": "Discography",          "kind": "about"},
    10: {"title": "B Young",              "kind": "artist", "artist": "B Young"},
    11: {"title": "Alicai Harley",        "kind": "artist", "artist": "Alicai Harley"},
    12: {"title": "Tion Wayne",           "kind": "artist", "artist": "Tion Wayne"},
    13: {"title": "Ambush x SP Montiz",   "kind": "artist", "artist": "Ambush x Sp Montiz"},
    14: {"title": "8CYN x Dre Six",       "kind": "artist", "artist": "Dre Six"},
    15: {"title": "Marley Waters",        "kind": "artist", "artist": "Marley Waters"},
    16: {"title": "Mowgs",                "kind": "artist", "artist": "Mowgs"},
    17: {"title": "Enigma",               "kind": "artist", "artist": "Enigma"},
    18: {"title": "Aden x Asme",          "kind": "artist", "artist": "Aden x Asme"},
    19: {"title": "Shainny / Mnelia",     "kind": "artist", "artist": "Mnelia"},
    20: {"title": "The Unkn?wn",          "kind": "artist", "artist": "The Unknown"},
    22: {"title": "Artistry",             "kind": "about"},
    23: {"title": "Engineering",          "kind": "about"},
    24: {"title": "Links",                "kind": "about"},
    25: {"title": "Philanthropy",         "kind": "about"},
}


def render(pdf_path, out_dir, data_path, width):
    doc = fitz.open(pdf_path)
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(os.path.dirname(data_path), exist_ok=True)

    missing = [p for p in SLIDES if p > doc.page_count]
    if missing:
        sys.exit(f"PDF has {doc.page_count} pages; SLIDES references {missing}")

    slides, total_bytes = [], 0

    for order, page_no in enumerate(sorted(SLIDES), start=1):
        meta = SLIDES[page_no]
        page = doc[page_no - 1]

        # zoom so the long edge lands on `width`
        zoom = width / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")

        stem = f"slide-{order:02d}"
        webp = os.path.join(out_dir, f"{stem}.webp")
        jpg = os.path.join(out_dir, f"{stem}.jpg")
        thumb = os.path.join(out_dir, f"thumb-{order:02d}.webp")

        img.save(webp, "WEBP", quality=82, method=6)
        img.save(jpg, "JPEG", quality=80, optimize=True, progressive=True)

        t = img.copy()
        t.thumbnail((320, 320))
        t.save(thumb, "WEBP", quality=72, method=6)

        size = os.path.getsize(webp)
        total_bytes += size

        slides.append({
            "order": order,
            "page": page_no,
            "title": meta["title"],
            "kind": meta["kind"],
            "artist": meta.get("artist"),
            # filled in later by the snippet build; null == disk spins silently
            "audio": None,
            "image": f"assets/deck/{stem}.webp",
            "fallback": f"assets/deck/{stem}.jpg",
            "thumb": f"assets/deck/thumb-{order:02d}.webp",
            "width": img.width,
            "height": img.height,
        })
        print(f"  {stem}  p{page_no:<3} {meta['title']:<22} {size/1024:6.1f} KB")

    payload = {
        "source": os.path.basename(pdf_path),
        "slideCount": len(slides),
        "slides": slides,
    }
    with open(data_path, "w") as fh:
        json.dump(payload, fh, indent=2)

    skipped = sorted(set(range(1, doc.page_count + 1)) - set(SLIDES))
    print(f"\n{len(slides)} slides -> {out_dir}  ({total_bytes/1e6:.1f} MB webp)")
    print(f"skipped pages: {skipped}")
    print(f"wrote {data_path}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=DEFAULT_PDF)
    ap.add_argument("--out", default="assets/deck")
    ap.add_argument("--data", default="data/deck.json")
    ap.add_argument("--width", type=int, default=1600)
    a = ap.parse_args()

    if not os.path.exists(a.pdf):
        sys.exit(f"PDF not found: {a.pdf}")
    render(a.pdf, a.out, a.data, a.width)
