from __future__ import annotations

import os
import pathlib
from typing import Tuple

# VolleyOS "V" crest + wordmark, Black (#070709) base, Crimson Red (#E11D48)
# foreground, white/red wordmark.
FOREGROUND = (225, 29, 72, 255)     # #E11D48
FOREGROUND_BRIGHT = (255, 23, 68, 255)  # #FF1744
BLACK = (7, 7, 9, 255)              # #070709
WHITE = (255, 255, 255, 255)
WORDMARK_RED = (255, 23, 68, 255)

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:
    raise SystemExit(f"Pillow required: pip install Pillow -> {exc}") from exc


def _best_font(draw: ImageDraw.ImageDraw, target_px: int) -> ImageFont.FreeTypeFont:
    """Prefer a system font near the requested pixel size; fall back gracefully."""
    candidates = (
        "SegoeUI-Bold.ttf",
        "SegoeUI.ttf",
        "Roboto-Bold.ttf",
        "Roboto-Regular.ttf",
        "Arial.ttf",
        "DejaVuSans-Bold.ttf",
        "DejaVuSans.ttf",
    )
    for cand in candidates:
        for root in (os.environ.get("WINDIR", "C:\\Windows"),
                     "/usr/share/fonts", "/usr/local/share/fonts"):
            if not root or not os.path.isdir(root):
                continue
            for dirpath, _, files in os.walk(root):
                if cand in files:
                    path = os.path.join(dirpath, cand)
                    try:
                        return ImageFont.truetype(path, target_px)
                    except Exception:
                        continue
    try:
        return ImageFont.truetype("arial.ttf", target_px)
    except Exception:
        return ImageFont.load_default()


def _vertical_logo_layer(size: Tuple[int, int]) -> Image.Image:
    """Render a small black + crimson crest with a subtle 'V' mark + wordmark."""
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = size[0] // 2, size[1] // 2
    diam = int(size[0] * 0.46)
    left, top = cx - diam // 2, cy - diam // 2

    # Outer circle, crimson
    draw.ellipse([left, top, left + diam, top + diam], fill=FOREGROUND)
    # Inner ring, near-black
    inner = int(diam * 0.70)
    draw.ellipse([cx - inner // 2, cy - inner // 2,
                  cx + inner // 2, cy + inner // 2], fill=BLACK)
    # Five stylized volleyball seams as crimson curved marks
    seam_count = 5
    for i in range(seam_count):
        angle = (2 * 3.141592653589793 * i) / seam_count
        x1 = cx + int((diam * 0.22) * __import__("math").cos(angle))
        y1 = cy + int((diam * 0.22) * __import__("math").sin(angle))
        x2 = cx + int((diam * 0.40) * __import__("math").cos(angle))
        y2 = cy + int((diam * 0.40) * __import__("math").sin(angle))
        draw.line([(x1, y1), (x2, y2)], fill=FOREGROUND_BRIGHT, width=max(2, diam // 22))

    # V mark centered
    big_font = _best_font(draw, int(diam * 0.42))
    v_text = "V"
    bbox = draw.textbbox((0, 0), v_text, font=big_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((cx - tw / 2 - bbox[0], cy - th / 2 - bbox[1] - int(th * 0.05)),
              v_text, font=big_font, fill=WHITE)

    return img


def _wordmark_layer(size: Tuple[int, int]) -> Image.Image:
    """Bold 'VoleyOS' wordmark, white with crimson accent on the final S."""
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    name = "VoleyOS"
    # Scale font to fit inside ~78% of width
    target_px = int(size[1] * 0.16)
    font = _best_font(draw, target_px)
    while target_px > 8:
        bbox = draw.textbbox((0, 0), name, font=font)
        w = bbox[2] - bbox[0]
        if w <= size[0] * 0.80 or target_px <= 10:
            break
        target_px = int(target_px * 0.85)
        font = _best_font(draw, target_px)

    bbox = draw.textbbox((0, 0), name, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size[0] - tw) / 2 - bbox[0]
    y = size[1] - int(size[1] * 0.28)

    # Draw character by character so the final 'S' is crimson
    cursor = x
    for i, ch in enumerate(name):
        color: Tuple[int, int, int, int] = WORDMARK_RED if ch == "S" and i == len(name) - 1 else WHITE
        draw.text((cursor, y - bbox[1]), ch, font=font, fill=color)
        ch_bbox = draw.textbbox((0, 0), ch, font=font)
        cursor += (ch_bbox[2] - ch_bbox[0])

    return img


def render_launcher_foreground(dst: pathlib.Path) -> None:
    """432x432 adaptive-icon foreground: crest on top, wordmark below."""
    size = (432, 432)
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    logo = _vertical_logo_layer(size)
    img.alpha_composite(logo, (0, 0))
    img.save(dst, "PNG")


def render_square_bitmap(src_fg: pathlib.Path, dst: pathlib.Path, size: int) -> None:
    """Opaque square launcher from the foreground design."""
    fg = Image.open(src_fg).convert("RGBA")
    out = Image.new("RGBA", (size, size), BLACK)
    fg_resized = fg.resize((size, size), Image.LANCZOS)
    out.alpha_composite(fg_resized, (0, 0))
    out = out.convert("RGB")
    out.save(dst, "PNG")


def render_round_bitmap(src_fg: pathlib.Path, dst: pathlib.Path, size: int) -> None:
    """Round launcher from the foreground design."""
    fg = Image.open(src_fg).convert("RGBA")
    out = Image.new("RGBA", (size, size), BLACK)
    fg_resized = fg.resize((size, size), Image.LANCZOS)
    out.alpha_composite(fg_resized, (0, 0))
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([1, 1, size - 2, size - 2], fill=255)
    out.putalpha(mask)
    out = out.convert("RGB")
    out.save(dst, "PNG")


def write_ic_launcher_xml(directory: pathlib.Path, foreground_name: str, background_name: str) -> None:
    xml = f"""<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/{background_name}" />
    <foreground android:drawable="@drawable/{foreground_name}" />
</adaptive-icon>
"""
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "ic_launcher.xml").write_text(xml, encoding="utf-8")
    (directory / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")


def write_background_vector(drawable: pathlib.Path) -> None:
    xml = """<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="oval">
    <solid android:color="#070709" />
</shape>
"""
    drawable.mkdir(parents=True, exist_ok=True)
    (drawable / "ic_launcher_background.xml").write_text(xml, encoding="utf-8")


def write_legacy_vector(legacy: pathlib.Path) -> None:
    xml = """<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <shape android:shape="oval">
            <solid android:color="#070709" />
        </shape>
    </item>
    <item
        android:drawable="@drawable/ic_launcher_foreground"
        android:gravity="center"
        android:left="12dp"
        android:top="12dp"
        android:right="12dp"
        android:bottom="12dp" />
</layer-list>
"""
    legacy.mkdir(parents=True, exist_ok=True)
    (legacy / "ic_launcher.xml").write_text(xml, encoding="utf-8")
    (legacy / "ic_launcher_round.xml").write_text(xml, encoding="utf-8")


DPI_SIZES = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}


def main() -> None:
    base = pathlib.Path("android/app/src/main/res")
    fg_drawable = base / "drawable-nodpi"
    fg_name = "ic_launcher_fg_bitmap"
    fg_path = fg_drawable / f"{fg_name}.png"

    write_ic_launcher_xml(base / "mipmap-anydpi-v26", fg_name, "ic_launcher_background")
    write_background_vector(base / "drawable")

    render_launcher_foreground(fg_path)

    for dir_name, size in DPI_SIZES.items():
        mipmap = base / f"mipmap-{dir_name}"
        mipmap.mkdir(parents=True, exist_ok=True)
        render_square_bitmap(fg_path, mipmap / "ic_launcher.png", size)
        render_round_bitmap(fg_path, mipmap / "ic_launcher_round.png", size)

    write_legacy_vector(base / "drawable")

    print("rendered:", fg_path)
    for dir_name, size in DPI_SIZES.items():
        print("png:", base / f"mipmap-{dir_name}" / "ic_launcher.png", size)


if __name__ == "__main__":
    main()
