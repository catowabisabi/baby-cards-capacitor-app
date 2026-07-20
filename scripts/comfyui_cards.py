#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BabyCards 批量生產卡片圖（用你自己嘅 ComfyUI Z-Image workflow）

讀 comfyui/BabyCards_900卡詞彙清單.xlsx，逐張經 ComfyUI 生成：
  真實風格（photorealistic）、全身大致體形、白背景
  → 1024 生成 → 正方裁切 → 縮 512x512 → 圓角 → WebP
  → 存入 public/cards/<主題>/<檔名id>.webp，兼寫埋 <檔名id>.json

用法：
  # 試水溫：animals 頭 3 張
  python scripts/comfyui_cards.py --theme animals --start 1 --count 3

  # 睇吓會做邊幾張（唔生成）
  python scripts/comfyui_cards.py --theme animals --start 1 --count 3 --dry-run

  # 成個主題 100 張
  python scripts/comfyui_cards.py --theme animals

注意：
- colors 主題唔使 gen（直接色塊圓角卡），呢個腳本暫時只搞要 gen 嘅主題
- 聲音檔（-en.mp3 / -cn.mp3）唔郁，淨係整圖同文字
- 會覆蓋同名 .webp（舊 kawaii 版喺 git history 搵得返）
"""
import argparse
import io
import json
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKFLOW_PATH = ROOT / "comfyui" / "Z Image - Logo.json"
XLSX_PATH = ROOT / "comfyui" / "BabyCards_900卡詞彙清單.xlsx"
CARDS_DIR = ROOT / "public" / "cards"

try:
    from comfyui_generate import discover_server  # noqa: E402
except ImportError:
    discover_server = None

try:
    from colors_renderer import (  # noqa: E402
        COLOR_HEX, SHAPES, PATTERNS, MODIFIERS,
        fill_solid, fill_shape, fill_pattern, fill_modifier,
    )
except ImportError:
    COLOR_HEX = SHAPES = PATTERNS = MODIFIERS = None
    fill_solid = fill_shape = fill_pattern = fill_modifier = None


def render_color_card(card, out_path):
    """Dispatch a colors-sheet card to the PIL renderer."""
    cid = card["id"]
    if cid in COLOR_HEX:
        fill_solid(card, out_path)
    elif cid in SHAPES:
        fill_shape(card, out_path)
    elif cid in PATTERNS:
        fill_pattern(card, out_path)
    elif cid in MODIFIERS:
        fill_modifier(card, out_path)
    else:
        raise ValueError(f"unknown colors id: {cid}")

GEN_SIZE = 1024      # Z-Image 原生解像度，出完先縮
CARD_SIZE = 512      # app 卡片最終尺寸
CORNER_RADIUS = 56   # 512px 下嘅圓角半徑，想調就改呢度

# workflow 入面要改嘅節點（跟 Z Image - Logo.json）
NODE_PROMPT = "45"   # CLIPTextEncode text
NODE_LATENT = "41"   # EmptySD3LatentImage 尺寸
NODE_SAMPLER = "44"  # KSampler seed
NODE_SAVE = "9"      # SaveImage filename_prefix

THEME_PROMPTS = {
    "animals": (
        "professional realistic studio photograph of {en}, one single animal, full body, "
        "whole body clearly visible, centered, plain pure white seamless background filling "
        "the entire frame, soft even studio lighting, sharp focus, high detail, "
        "no text, no watermark, no border, no frame"
    ),
    "cars": (
        "professional realistic studio photograph of a {en}, single vehicle, no driver, no people, "
        "whole vehicle clearly visible from front three-quarter angle, centered, plain pure white "
        "seamless background filling the entire frame, soft even studio lighting, sharp focus, "
        "high detail, no text, no watermark, no border, no frame"
    ),
    "fruits": (
        "professional realistic studio photograph of a single {en}, whole fruit clearly visible, "
        "centered, plain pure white seamless background filling the entire frame, "
        "soft even studio lighting, sharp focus, high detail, fresh, appetizing, "
        "no text, no watermark, no border, no frame"
    ),
    "food": (
        "professional realistic studio photograph of {en}, single dish, top-down three-quarter view, "
        "whole dish clearly visible, centered, plain pure white seamless background filling "
        "the entire frame, soft even studio lighting, sharp focus, high detail, appetizing, "
        "no text, no watermark, no border, no frame"
    ),
    "family": (
        "professional realistic friendly portrait of a {en}, single person, clearly visible, "
        "warm smile, centered, plain pure white seamless background filling the entire frame, "
        "soft even studio lighting, sharp focus, high detail, "
        "no text, no watermark, no border, no frame"
    ),
    "body": (
        "professional realistic studio photograph of a human {en}, isolated body part clearly visible, "
        "clean skin, centered, plain pure white seamless background filling the entire frame, "
        "soft even studio lighting, sharp focus, high detail, "
        "no text, no watermark, no border, no frame"
    ),
    "clothes": (
        "professional realistic studio photograph of a single {en}, garment laid flat or on invisible mannequin, "
        "whole item clearly visible, centered, plain pure white seamless background filling the entire frame, "
        "soft even studio lighting, sharp focus, high detail, "
        "no text, no watermark, no border, no frame"
    ),
    "toys": (
        "professional realistic studio photograph of a single {en} toy, whole toy clearly visible, "
        "centered, plain pure white seamless background filling the entire frame, "
        "soft even studio lighting, sharp focus, high detail, "
        "no text, no watermark, no border, no frame"
    ),
}


def api_post(server, path, payload, timeout=60):
    req = urllib.request.Request(
        f"http://{server}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        return json.load(urllib.request.urlopen(req, timeout=timeout))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        print(f"❌ ComfyUI 拒絕咗個 workflow（HTTP {e.code}）：\n{body}", file=sys.stderr)
        sys.exit(1)


def api_get(server, path, timeout=30):
    return json.load(urllib.request.urlopen(f"http://{server}{path}", timeout=timeout))


def load_words(theme):
    import openpyxl
    wb = openpyxl.load_workbook(XLSX_PATH, read_only=True)
    ws = wb[theme]
    words = []
    for row in ws.iter_rows(min_row=4, values_only=True):
        # 欄位：B=No. C=English D=中文 E=檔名id
        no, en, cn, fid = row[1], row[2], row[3], row[4]
        if en and fid:
            words.append({
                "no": no,
                "en": str(en).strip(),
                "cn": str(cn).strip() if cn else "",
                "id": str(fid).strip(),
            })
    return words


def generate_one(server, workflow, prompt_text, seed, timeout=300):
    wf = json.loads(json.dumps(workflow))  # deep copy
    wf[NODE_PROMPT]["inputs"]["text"] = prompt_text
    wf[NODE_LATENT]["inputs"]["width"] = GEN_SIZE
    wf[NODE_LATENT]["inputs"]["height"] = GEN_SIZE
    wf[NODE_SAMPLER]["inputs"]["seed"] = seed
    wf[NODE_SAVE]["inputs"]["filename_prefix"] = "babycards"

    resp = api_post(server, "/prompt", {"prompt": wf, "client_id": str(uuid.uuid4())})
    prompt_id = resp["prompt_id"]

    t0 = time.time()
    while time.time() - t0 < timeout:
        entry = api_get(server, f"/history/{prompt_id}").get(prompt_id)
        if entry and (entry.get("outputs") or entry.get("status", {}).get("completed")):
            break
        time.sleep(1.5)
    else:
        raise TimeoutError(f"等咗 {timeout}s 都未好（prompt_id={prompt_id}）")

    for node_output in entry.get("outputs", {}).values():
        for img in node_output.get("images", []):
            q = urllib.parse.urlencode({
                "filename": img["filename"],
                "subfolder": img.get("subfolder", ""),
                "type": img.get("type", "output"),
            })
            return urllib.request.urlopen(f"http://{server}/view?{q}", timeout=120).read()
    raise RuntimeError("history 入面搵唔到輸出圖")


def rounded_card_webp(png_bytes, out_path):
    from PIL import Image, ImageDraw
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    w, h = im.size
    s = min(w, h)  # 正方置中裁切
    im = im.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))
    im = im.resize((CARD_SIZE, CARD_SIZE), Image.LANCZOS)
    mask = Image.new("L", (CARD_SIZE, CARD_SIZE), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, CARD_SIZE - 1, CARD_SIZE - 1], radius=CORNER_RADIUS, fill=255)
    im.putalpha(mask)
    im.save(out_path, "WEBP", quality=90, method=6)


def write_card_json(theme, card):
    payload = {"en": card["en"], "cn": card["cn"]}
    path = CARDS_DIR / theme / f"{card['id']}.json"
    path.write_text(f'{{ "en": {json.dumps(payload["en"], ensure_ascii=False)}, '
                    f'"cn": {json.dumps(payload["cn"], ensure_ascii=False)} }}\n',
                    encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description="BabyCards 批量生成卡片圖（Z-Image workflow）")
    ap.add_argument("--theme", required=True, help="xlsx 主題頁名，例如 animals")
    ap.add_argument("--start", type=int, default=1, help="由第幾號開始（1-based）")
    ap.add_argument("--count", type=int, default=0, help="做幾多張（0=晒全部）")
    ap.add_argument("--server", default=None, help="ComfyUI host:port（唔填自動 ping 8188/8000）")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    words = load_words(args.theme)
    selected = [w for w in words if w["no"] >= args.start]
    if args.count:
        selected = selected[:args.count]
    if not selected:
        print("冇卡要做"); return

    print(f"主題 {args.theme}：做 {len(selected)} 張（No.{selected[0]['no']}–{selected[-1]['no']}）")
    if args.dry_run:
        for w in selected:
            print(f"  No.{w['no']:>3} {w['id']:<20} {w['en']} / {w['cn']}")
        return

    out_dir = CARDS_DIR / args.theme
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.theme == "colors" and fill_solid is not None:
        from colors_renderer import write_card_json as wr_colors_write
        for i, card in enumerate(selected, 1):
            webp_path = out_dir / f"{card['id']}.webp"
            render_color_card(card, webp_path)
            wr_colors_write(out_dir, card)
            if i % 10 == 0 or i == len(selected):
                print(f"    [{i}/{len(selected)}]", flush=True)
        print(f"搞掂 {len(selected)} 張 colors 卡。記得 `npm run cards:manifest` 更新 manifest。")
        return

    if discover_server is not None:
        server, info = discover_server(prefer=args.server)
        if server != args.server:
            v = info.get("system", {}).get("comfyui_version", "?")
            print(f"ℹ️  auto-discovered ComfyUI at {server} (v{v})")
    else:
        server = args.server or "127.0.0.1:8188"

    workflow = json.loads(WORKFLOW_PATH.read_text(encoding="utf-8"))

    for i, card in enumerate(selected, 1):
        webp_path = out_dir / f"{card['id']}.webp"
        prompt_text = THEME_PROMPTS[args.theme].format(en=card["en"])
        seed = random.randint(0, 2**63 - 1)
        print(f"[{i}/{len(selected)}] {card['id']}（{card['en']} / {card['cn']}）seed={seed} …", flush=True)
        png = generate_one(server, workflow, prompt_text, seed)
        rounded_card_webp(png, webp_path)
        write_card_json(args.theme, card)
        print(f"    ✅ {webp_path.relative_to(ROOT)}", flush=True)

    print("搞掂。記得 `npm run cards:manifest` 更新 manifest（predev/prebuild 都會自動跑）。")


if __name__ == "__main__":
    main()
