"""Color/shape/pattern card renderer (no ComfyUI needed).

Three card kinds for the colors sheet:
- No.1-50:  solid color block (hex map)
- No.51-75: shape outline (PIL draw)
- No.76-90: pattern/texture (PIL tiled)
- No.91-100: solid color + label text ("SHINY" / "MATTE" etc.)

Output: 512×512 RGBA, white safe area inside radius-56 rounded corner (matches existing card style).
"""
import io
import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

CARD_SIZE = 512
CORNER_RADIUS = 56

COLOR_HEX = {
    "red": "#E74C3C", "blue": "#3498DB", "yellow": "#F1C40F", "green": "#27AE60",
    "orange": "#E67E22", "purple": "#8E44AD", "pink": "#FF6FA8", "brown": "#8B5A3C",
    "black": "#2C2C2C", "white": "#F5F5F5", "grey": "#7F7F7F", "gold": "#D4AF37",
    "silver": "#C0C0C0", "sky-blue": "#87CEEB", "navy": "#1F3A93",
    "light-blue": "#A8D8F0", "turquoise": "#40E0D0", "teal": "#008080",
    "mint": "#AAF0C8", "lime": "#BFFF00", "olive": "#808000",
    "light-green": "#90EE90", "dark-green": "#006400", "beige": "#F5F5DC",
    "cream": "#FFFDD0", "khaki": "#C3B091", "maroon": "#800000",
    "crimson": "#DC143C", "coral": "#FF7F50", "peach": "#FFDAB9",
    "lavender": "#B57EDC", "lilac": "#C8A2C8", "violet": "#8F00FF",
    "magenta": "#FF00FF", "rose": "#FF66B2", "burgundy": "#800020",
    "rust": "#B7410E", "copper": "#B87333", "bronze": "#CD7F32",
    "amber": "#FFBF00", "mustard": "#FFDB58", "lemon": "#FFF44F",
    "indigo": "#4B0082", "cyan": "#00FFFF", "aqua": "#7FFFD4",
    "salmon": "#FA8072", "apricot": "#FBCEB1", "ivory": "#FFFFF0",
    "charcoal": "#36454F", "rainbow": "RAINBOW",
}

# No.51-75 shapes
SHAPES = {
    "circle", "square", "triangle", "rectangle", "oval", "star", "heart",
    "diamond", "pentagon", "hexagon", "octagon", "semicircle", "crescent",
    "cross", "arrow", "spiral", "zigzag", "wave",
    "cube", "sphere", "cone", "cylinder", "pyramid", "prism", "torus",
}

# No.76-90 patterns
PATTERNS = {
    "stripes", "polka-dots", "checkered", "plaid", "chevron", "herringbone",
    "houndstooth", "paisley", "floral", "leopard-print", "zebra-print",
    "cow-print", "camouflage", "tie-dye", "marble",
}


def card_pattern_seed(s):
    """Deterministic 31-bit seed for procedural pattern noise, derived from card id."""
    return sum(ord(ch) for ch in s) % (2**31)

# No.91-100 modifier labels; tinted card with TEXT
MODIFIERS = {
    "transparent": ("rgba-tinted", "#EAF4FF"),
    "shiny": ("gold tone", "#FFD700"),
    "matte": ("dust gray", "#9E9E9E"),
    "neon": ("neon green", "#39FF14"),
    "pastel": ("pastel pink", "#FFB3BA"),
    "dark": ("dark slate", "#333"),
    "light": ("cream", "#FFFAF0"),
    "bright": ("vivid red", "#FF0000"),
    "colorful": ("rainbow", "RAINBOW"),
    "sparkle": ("silver spark", "#C8C8FF"),
}


def render_rounded_card(rgba_img, out_path):
    """Apply 56px rounded corner mask + save WEBP."""
    size = CARD_SIZE
    im = rgba_img.resize((size, size), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=CORNER_RADIUS, fill=255
    )
    im.putalpha(mask)
    im.save(out_path, "WEBP", quality=90, method=6)


def _safe_area():
    """White inner background the shape/icon sits on top of."""
    return Image.new("RGBA", (CARD_SIZE, CARD_SIZE), (255, 255, 255, 255))


def _pick_font(size):
    """Try CJK-capable fonts first so Chinese characters don't render as boxes.
    PIL truetype() only raises OSError on missing FILE, not missing GLYPHS,
    so arial.ttf has to come AFTER the CJK fonts in the chain.
    """
    cjk_candidates = (
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/msyhbd.ttc",
        "C:/Windows/Fonts/simsun.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/System/Library/Fonts/PingFang.ttc",
    )
    for path in cjk_candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def _label(card, draw, fill=(60, 60, 60)):
    """Print EN big + CN small at bottom."""
    font_big = _pick_font(38)
    font_sm = _pick_font(26)
    en = card["en"]
    cn = card["cn"]
    bbox = draw.textbbox((0, 0), en, font=font_big)
    w = bbox[2] - bbox[0]
    draw.text(((CARD_SIZE - w) // 2, CARD_SIZE - 90), en, font=font_big, fill=fill)
    bbox = draw.textbbox((0, 0), cn, font=font_sm)
    w = bbox[2] - bbox[0]
    draw.text(((CARD_SIZE - w) // 2, CARD_SIZE - 42), cn, font=font_sm, fill=(110, 110, 110))


def fill_solid(card, out_path):
    """Pure color block — No.1-50."""
    fill = COLOR_HEX.get(card["id"], "#CCCCCC")
    if fill == "RAINBOW":
        return _render_rainbow(card, out_path)
    im = _safe_area()
    # Centered block filling most of card
    bx0, by0, bx1, by1 = 60, 60, CARD_SIZE - 60, CARD_SIZE - 130
    ImageDraw.Draw(im).rounded_rectangle(
        [bx0, by0, bx1, by1], radius=24, fill=fill
    )
    draw = ImageDraw.Draw(im)
    _label(card, draw, fill=(255, 255, 255) if fill.lower() in ("#2c2c2c", "#1f3a93", "#800000", "#006400", "#333", "#4b0082", "#1c1c1c") else (60, 60, 60))
    render_rounded_card(im, out_path)


def _render_rainbow(card, out_path):
    """Rainbow diagonal stripes."""
    im = _safe_area()
    draw = ImageDraw.Draw(im)
    colors = [
        "#E74C3C", "#E67E22", "#F1C40F", "#27AE60", "#3498DB", "#8E44AD"
    ]
    bx0, by0, bx1, by1 = 60, 60, CARD_SIZE - 60, CARD_SIZE - 130
    n = len(colors)
    for i, c in enumerate(colors):
        x0 = bx0 + int((bx1 - bx0) * i / n)
        x1 = bx0 + int((bx1 - bx0) * (i + 1) / n)
        draw.rectangle([x0, by0, x1, by1], fill=c)
    _label(card, draw)
    render_rounded_card(im, out_path)


def _shape_draw_factory(shape):
    """Return draw_func(canvas, fill_color) for each shape name."""
    cx, cy = CARD_SIZE // 2, (CARD_SIZE - 130) // 2 + 30

    def d_circle(c, color):
        r = 130
        ImageDraw.Draw(c).ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    def d_square(c, color):
        s = 220
        ImageDraw.Draw(c).rectangle([cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2], fill=color)
    def d_rectangle(c, color):
        w, h = 280, 150
        ImageDraw.Draw(c).rectangle([cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2], fill=color)
    def d_triangle(c, color):
        pts = [(cx, cy - 130), (cx - 130, cy + 100), (cx + 130, cy + 100)]
        ImageDraw.Draw(c).polygon(pts, fill=color)
    def d_oval(c, color):
        w, h = 160, 90
        ImageDraw.Draw(c).ellipse([cx - w, cy - h, cx + w, cy + h], fill=color)
    def d_star(c, color):
        import math as m
        r_out, r_in = 140, 60
        pts = []
        for i in range(10):
            r = r_out if i % 2 == 0 else r_in
            a = m.pi / 2 - i * m.pi / 5
            pts.append((cx + r * m.cos(a), cy - r * m.sin(a) + 20))
        ImageDraw.Draw(c).polygon(pts, fill=color)
    def d_heart(c, color):
        w = 260
        top = cy - 30
        ImageDraw.Draw(c).polygon([
            (cx, cy + 130),
            (cx - w // 2, top + 20),
            (cx - w // 4 - 10, top - 60),
            (cx, top - 10),
            (cx + w // 4 + 10, top - 60),
            (cx + w // 2, top + 20),
        ], fill=color)
    def d_diamond(c, color):
        s = 130
        pts = [(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)]
        ImageDraw.Draw(c).polygon(pts, fill=color)
    def d_pentagon(c, color):
        import math as m
        r = 140
        pts = [(cx + r * m.cos(m.pi / 2 - i * 2 * m.pi / 5), cy - r * m.sin(m.pi / 2 - i * 2 * m.pi / 5)) for i in range(5)]
        ImageDraw.Draw(c).polygon(pts, fill=color)
    def d_hexagon(c, color):
        import math as m
        r = 140
        pts = [(cx + r * m.cos(i * m.pi / 3), cy + r * m.sin(i * m.pi / 3)) for i in range(6)]
        ImageDraw.Draw(c).polygon(pts, fill=color)
    def d_octagon(c, color):
        import math as m
        r = 140
        pts = [(cx + r * m.cos(i * m.pi / 4 + m.pi / 8), cy + r * m.sin(i * m.pi / 4 + m.pi / 8)) for i in range(8)]
        ImageDraw.Draw(c).polygon(pts, fill=color)
    def d_semicircle(c, color):
        r = 140
        ImageDraw.Draw(c).pieslice([cx - r, cy - r // 2, cx + r, cy + r * 2], 180, 360, fill=color)
    def d_crescent(c, color):
        r_out, r_in = 140, 110
        c2 = Image.new("L", (CARD_SIZE, CARD_SIZE), 0)
        ImageDraw.Draw(c2).ellipse([cx - r_out, cy - r_out, cx + r_out, cy + r_out], fill=255)
        ImageDraw.Draw(c2).ellipse([cx - r_in + 30, cy - r_in, cx + r_in + 30, cy + r_in], fill=0)
        c.paste(color, (0, 0), c2)
    def d_cross(c, color):
        t = 50
        ImageDraw.Draw(c).rectangle([cx - t, cy - 130, cx + t, cy + 130], fill=color)
        ImageDraw.Draw(c).rectangle([cx - 130, cy - t, cx + 130, cy + t], fill=color)
    def d_arrow(c, color):
        pts = [(cx - 130, cy - 40), (cx + 50, cy - 40),
               (cx + 50, cy - 90), (cx + 140, cy + 10),
               (cx + 50, cy + 90), (cx + 50, cy + 40),
               (cx - 130, cy + 40)]
        ImageDraw.Draw(c).polygon(pts, fill=color)
    def d_spiral(c, color):
        import math as m
        d = ImageDraw.Draw(c)
        prev = None
        for t_int in range(0, 720, 4):
            t = t_int / 720 * 4 * m.pi
            r = 20 + 6 * t
            x, y = cx + r * m.cos(t), cy + r * m.sin(t)
            if prev:
                d.line([prev, (x, y)], fill=color, width=10)
            prev = (x, y)
    def d_zigzag(c, color):
        pts = []
        for i in range(7):
            x = cx - 150 + i * 50
            y = cy - 80 if i % 2 == 0 else cy + 80
            pts.append((x, y))
        ImageDraw.Draw(c).line(pts + [pts[0]], fill=color, width=14)
        ImageDraw.Draw(c).polygon(
            [pts[-1], (pts[-1][0] + 30, pts[-1][1] - 15),
             (pts[-1][0] + 30, pts[-1][1] + 15)], fill=color
        )
    def d_wave(c, color):
        import math as m
        pts = []
        for x in range(0, 360, 6):
            y = cy + 60 * m.sin(x / 30)
            pts.append((cx - 180 + x, y))
        ImageDraw.Draw(c).line(pts * 3, fill=color, width=14)
    def d_cube(c, color):
        s = 180
        # front face
        ImageDraw.Draw(c).rectangle([cx - s, cy - s // 2, cx, cy + s // 2], fill=color)
        # top face (offset parallelogram) lighter
        ImageDraw.Draw(c).polygon(
            [(cx - s, cy - s // 2), (cx - s + 50, cy - s // 2 - 50),
             (cx + 50, cy - s // 2 - 50), (cx, cy - s // 2)], fill=color
        )
        # right face darker
        ImageDraw.Draw(c).polygon(
            [(cx, cy - s // 2), (cx + 50, cy - s // 2 - 50),
             (cx + 50, cy + s // 2 - 50), (cx, cy + s // 2)], fill="#888"
        )
    def d_sphere(c, color):
        r = 140
        d = ImageDraw.Draw(c)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
        # highlight
        d.ellipse([cx - r // 2, cy - r, cx + r // 4, cy - r // 4], fill="#FFFFFF")
    def d_cone(c, color):
        pts = [(cx, cy - 130), (cx - 90, cy + 100), (cx + 90, cy + 100)]
        ImageDraw.Draw(c).polygon(pts, fill=color)
        ImageDraw.Draw(c).ellipse([cx - 90, cy + 90, cx + 90, cy + 110], fill="#888")
    def d_cylinder(c, color):
        r = 80
        h = 200
        ImageDraw.Draw(c).rectangle([cx - r, cy - h // 2, cx + r, cy + h // 2], fill=color)
        ImageDraw.Draw(c).ellipse([cx - r, cy - h // 2 - r // 4, cx + r, cy - h // 2 + r // 4], fill="#aaa")
        ImageDraw.Draw(c).ellipse([cx - r, cy + h // 2 - r // 4, cx + r, cy + h // 2 + r // 4], fill=color)
    def d_pyramid(c, color):
        ImageDraw.Draw(c).polygon([(cx, cy - 130), (cx - 130, cy + 100), (cx + 130, cy + 100)], fill=color)
        ImageDraw.Draw(c).polygon([(cx, cy - 130), (cx + 130, cy + 100), (cx + 50, cy + 100)], fill="#aaa")
    def d_prism(c, color):
        import math as m
        r = 130
        pts = []
        for i in range(3):
            a = m.pi / 2 + i * 2 * m.pi / 3
            pts.append((cx + r * m.cos(a), cy + r * m.sin(a)))
        ImageDraw.Draw(c).polygon(pts, fill=color)
        ImageDraw.Draw(c).polygon(
            [pts[0], (pts[0][0] + 40, pts[0][1] - 40),
             (pts[1][0] + 40, pts[1][1] - 40), pts[1]], fill="#bbb"
        )
    def d_torus(c, color):
        r1, r2 = 110, 50
        ImageDraw.Draw(c).ellipse([cx - r1, cy - r2, cx + r1, cy + r2], outline=color, width=42)

    return {
        "circle": d_circle, "square": d_square, "rectangle": d_rectangle,
        "triangle": d_triangle, "oval": d_oval, "star": d_star, "heart": d_heart,
        "diamond": d_diamond, "pentagon": d_pentagon, "hexagon": d_hexagon,
        "octagon": d_octagon, "semicircle": d_semicircle, "crescent": d_crescent,
        "cross": d_cross, "arrow": d_arrow, "spiral": d_spiral, "zigzag": d_zigzag,
        "wave": d_wave, "cube": d_cube, "sphere": d_sphere, "cone": d_cone,
        "cylinder": d_cylinder, "pyramid": d_pyramid, "prism": d_prism,
        "torus": d_torus,
    }[shape]


def fill_shape(card, out_path):
    im = _safe_area()
    factory = _shape_draw_factory(card["id"])
    factory(im, "#3498DB")
    _label(card, ImageDraw.Draw(im))
    render_rounded_card(im, out_path)


def _pattern_draw_factory(pattern):
    cx, cy = CARD_SIZE // 2, (CARD_SIZE - 130) // 2 + 20
    bx0, by0, bx1, by1 = 60, 60, CARD_SIZE - 60, CARD_SIZE - 130

    def p_stripes(c, card):
        d = ImageDraw.Draw(c)
        for x in range(bx0, bx1, 30):
            d.rectangle([x, by0, x + 15, by1], fill="#E91E63")
    def p_polka(c, card):
        d = ImageDraw.Draw(c)
        d.rectangle([bx0, by0, bx1, by1], fill="#FFB74D")
        for x in range(bx0 + 20, bx1, 50):
            for y in range(by0 + 20, by1, 50):
                d.ellipse([x, y, x + 25, y + 25], fill="#E91E63")
    def p_checkered(c, card):
        d = ImageDraw.Draw(c)
        s = 40
        for i, x in enumerate(range(bx0, bx1, s)):
            for j, y in enumerate(range(by0, by1, s)):
                if (i + j) % 2 == 0:
                    d.rectangle([x, y, x + s, y + s], fill="#2C2C2C")
                else:
                    d.rectangle([x, y, x + s, y + s], fill="#F5F5F5")
    def p_plaid(c, card):
        d = ImageDraw.Draw(c)
        d.rectangle([bx0, by0, bx1, by1], fill="#B71C1C")
        for x in range(bx0, bx1, 36):
            d.line([(x, by0), (x, by1)], fill="#FFF", width=4)
        for y in range(by0, by1, 36):
            d.line([(bx0, y), (bx1, y)], fill="#FFE082", width=4)
    def p_chevron(c, card):
        d = ImageDraw.Draw(c)
        for i in range(6):
            y = by0 + i * 50
            pts = [(bx0, y), (bx1, y), (bx1, y + 25), (bx0, y + 25)]
            col = "#1976D2" if i % 2 == 0 else "#FFEB3B"
            d.polygon(pts, fill=col)
    def p_herringbone(c, card):
        d = ImageDraw.Draw(c)
        for y in range(by0, by1, 24):
            for x in range(bx0, bx1, 48):
                d.rectangle([x, y, x + 40, y + 18], fill="#3E2723")
                d.rectangle([x + 20, y - 10, x + 28, y + 8], fill="#3E2723")
    def p_houndstooth(c, card):
        d = ImageDraw.Draw(c)
        s = 50
        for i in range(bx0, bx1, s):
            for j in range(by0, by1, s):
                # white square + 4 corner black bites
                d.rectangle([i, j, i + s, j + s], fill="#FFF")
                d.polygon([(i, j), (i + s // 2, j), (i, j + s // 2)], fill="#000")
                d.polygon([(i + s, j + s // 2), (i + s, j + s), (i + s // 2, j + s)], fill="#000")
    def p_paisley(c, card):
        d = ImageDraw.Draw(c)
        d.rectangle([bx0, by0, bx1, by1], fill="#4A148C")
        for x in range(bx0 + 30, bx1, 70):
            for y in range(by0 + 30, by1, 70):
                d.ellipse([x, y, x + 50, y + 70], fill="#E91E63")
                d.ellipse([x + 15, y + 5, x + 35, y + 25], fill="#4A148C")
    def p_floral(c, card):
        d = ImageDraw.Draw(c)
        d.rectangle([bx0, by0, bx1, by1], fill="#FFFDE7")
        for x in range(bx0 + 30, bx1, 60):
            for y in range(by0 + 30, by1, 60):
                for ang in range(6):
                    a = ang * math.pi / 3
                    d.ellipse(
                        [x + 12 * math.cos(a) - 10, y + 12 * math.sin(a) - 10,
                         x + 12 * math.cos(a) + 10, y + 12 * math.sin(a) + 10],
                        fill="#EC407A"
                    )
                d.ellipse([x - 8, y - 8, x + 8, y + 8], fill="#FFEB3B")
    def p_leopard(c, card):
        d = ImageDraw.Draw(c)
        d.rectangle([bx0, by0, bx1, by1], fill="#FFD54F")
        import random
        rnd = random.Random(card_pattern_seed(card["id"]))
        for _ in range(60):
            x = rnd.randint(bx0 + 10, bx1 - 30)
            y = rnd.randint(by0 + 10, by1 - 30)
            d.ellipse([x, y, x + 30, y + 22], outline="#3E2723", width=4)
            d.ellipse([x + 10, y + 6, x + 18, y + 14], fill="#3E2723")
    def p_zebra(c, card):
        d = ImageDraw.Draw(c)
        d.rectangle([bx0, by0, bx1, by1], fill="#FFF")
        for i in range(8):
            x = bx0 + i * ((bx1 - bx0) // 8)
            d.polygon([(x, by0), (x + 40, by0), (x + 60, by1), (x + 20, by1)], fill="#000")
    def p_cow(c, card):
        d = ImageDraw.Draw(c)
        d.rectangle([bx0, by0, bx1, by1], fill="#FFF")
        import random
        rnd = random.Random(card_pattern_seed(card["id"]))
        for _ in range(12):
            x = rnd.randint(bx0 + 10, bx1 - 80)
            y = rnd.randint(by0 + 10, by1 - 60)
            w = rnd.randint(50, 90)
            h = rnd.randint(40, 60)
            d.ellipse([x, y, x + w, y + h], fill="#000")
    def p_camo(c, card):
        d = ImageDraw.Draw(c)
        d.rectangle([bx0, by0, bx1, by1], fill="#558B2F")
        import random
        rnd = random.Random(card_pattern_seed(card["id"]))
        for _ in range(60):
            x = rnd.randint(bx0, bx1)
            y = rnd.randint(by0, by1)
            w = rnd.randint(40, 90)
            h = rnd.randint(20, 50)
            col = rnd.choice(["#33691E", "#827717", "#4E342E"])
            d.ellipse([x, y, x + w, y + h], fill=col)
    def p_tie_dye(c, card):
        d = ImageDraw.Draw(c)
        import random
        rnd = random.Random(card_pattern_seed(card["id"]))
        for _ in range(120):
            x = rnd.randint(bx0, bx1)
            y = rnd.randint(by0, by1)
            r = rnd.randint(20, 80)
            col = rnd.choice(["#E91E63", "#3F51B5", "#FF9800", "#4CAF50", "#9C27B0"])
            d.ellipse([x - r, y - r, x + r, y + r], fill=col)
    def p_marble(c, card):
        d = ImageDraw.Draw(c)
        d.rectangle([bx0, by0, bx1, by1], fill="#F5F5F5")
        import random
        rnd = random.Random(card_pattern_seed(card["id"]))
        for i in range(20):
            x0 = rnd.randint(bx0, bx1)
            y0 = rnd.randint(by0, by1)
            x1 = x0 + rnd.randint(-50, 50)
            y1 = y0 + rnd.randint(-50, 50)
            d.line([(x0, y0), (x1, y1)], fill="#9E9E9E", width=2)

    return {
        "stripes": p_stripes, "polka-dots": p_polka, "checkered": p_checkered,
        "plaid": p_plaid, "chevron": p_chevron, "herringbone": p_herringbone,
        "houndstooth": p_houndstooth, "paisley": p_paisley, "floral": p_floral,
        "leopard-print": p_leopard, "zebra-print": p_zebra, "cow-print": p_cow,
        "camouflage": p_camo, "tie-dye": p_tie_dye, "marble": p_marble,
    }[pattern]


def fill_pattern(card, out_path):
    im = _safe_area()
    _pattern_draw_factory(card["id"])(im, card)
    _label(card, ImageDraw.Draw(im))
    render_rounded_card(im, out_path)


def fill_modifier(card, out_path):
    """Solid color tinted card with modifier word + chinese annotation."""
    info = MODIFIERS.get(card["id"], ("#E0E0E0", "#999999"))
    en_label, bg_hex = info
    if bg_hex == "RAINBOW":
        return _render_rainbow(card, out_path)
    im = _safe_area()
    draw = ImageDraw.Draw(im)
    bx0, by0, bx1, by1 = 60, 60, CARD_SIZE - 60, CARD_SIZE - 130
    draw.rounded_rectangle([bx0, by0, bx1, by1], radius=24, fill=bg_hex)
    _label(card, draw)
    render_rounded_card(im, out_path)


def write_card_json(out_dir, card):
    payload = {"en": card["en"], "cn": card["cn"]}
    path = Path(out_dir) / f"{card['id']}.json"
    path.write_text(
        f'{{ "en": {json.dumps(payload["en"], ensure_ascii=False)}, '
        f'"cn": {json.dumps(payload["cn"], ensure_ascii=False)} }}\n',
        encoding="utf-8",
    )