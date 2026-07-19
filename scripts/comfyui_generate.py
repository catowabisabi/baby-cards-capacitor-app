#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ComfyUI API 極簡調用腳本（純標準庫，唔使 pip install 任何嘢）

用法：
  # 列出所有可用 checkpoint
  python scripts/comfyui_generate.py --list-models

  # 生成一張圖（預設 512x512、20 steps）
  python scripts/comfyui_generate.py --prompt "cute kawaii cat sticker, white background"

  # SDXL 模型建議 1024，加 --webp 會順便轉 512px WebP（啱晒 app 卡片用）
  python scripts/comfyui_generate.py --prompt "..." --width 1024 --height 1024 --webp

  # 如果生成時間長過终端 timeout，會見到 prompt_id，之後可以咁樣攞返：
  python scripts/comfyui_generate.py --fetch <prompt_id>

原理（ComfyUI API 三步曲）：
  1. POST /prompt   —— 將 workflow JSON（API 格式）排入隊，攞到 prompt_id
  2. GET  /history/{prompt_id} —— 輪詢直到完成，睇到輸出檔名
  3. GET  /view?filename=...   —— 下載張圖

注意：/prompt 食嘅係「API 格式 workflow」（節點圖），唔係淨文字 prompt。
喺 ComfyUI 網界面板撳「Export (API)」可以匯出你自己嘅 workflow 嚟改。
"""
import argparse
import json
import random
import sys
import time
import uuid
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_SERVER = "127.0.0.1:8188"
# 預設模型：可愛風 SDXL（你機上有 114 個，用 --ckpt 換，--list-models 睇晒）
DEFAULT_CKPT = r"SD\SDXL\copaxCuteXL\copaxCuteXLSDXL10_v4.safetensors"
DEFAULT_NEGATIVE = "lowres, bad anatomy, blurry, watermark, text, signature, jpeg artifacts, ugly, deformed, extra limbs"


def api_get(server, path, timeout=30):
    return json.load(urllib.request.urlopen(f"http://{server}{path}", timeout=timeout))


def api_post(server, path, payload, timeout=30):
    req = urllib.request.Request(
        f"http://{server}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        return json.load(urllib.request.urlopen(req, timeout=timeout))
    except urllib.error.HTTPError as e:
        # ComfyUI 驗證 workflow 失敗會回 400 + 原因，印出嚟方便 debug
        body = e.read().decode("utf-8", "replace")
        print(f"❌ ComfyUI 拒絕咗個 workflow（HTTP {e.code}）：\n{body}", file=sys.stderr)
        sys.exit(1)


def list_models(server):
    info = api_get(server, "/object_info/CheckpointLoaderSimple")
    names = info["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"][0]
    print(f"共 {len(names)} 個 checkpoint：")
    for n in names:
        print(" -", n)


def build_workflow(prompt, negative, ckpt, width, height, steps, cfg, seed):
    """最基本嘅 txt2img 節點圖（適用於 SD1.5 / SDXL checkpoint）。"""
    return {
        "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": ckpt}},
        "5": {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": 1}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["4", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["4", 1]}},
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed, "steps": steps, "cfg": cfg,
                "sampler_name": "euler", "scheduler": "normal", "denoise": 1.0,
                "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0],
                "latent_image": ["5", 0],
            },
        },
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "kimi_gen", "images": ["8", 0]}},
    }


def queue_prompt(server, workflow):
    client_id = str(uuid.uuid4())
    resp = api_post(server, "/prompt", {"prompt": workflow, "client_id": client_id})
    return resp["prompt_id"]


def wait_result(server, prompt_id, timeout):
    t0 = time.time()
    while time.time() - t0 < timeout:
        history = api_get(server, f"/history/{prompt_id}")
        entry = history.get(prompt_id)
        if entry and (entry.get("outputs") or entry.get("status", {}).get("completed")):
            return entry
        time.sleep(2)
    raise TimeoutError(f"等咗 {timeout}s 都未生成完，可以之後用 --fetch {prompt_id} 攞返")


def download_images(server, entry, out_dir):
    saved = []
    for node_output in entry.get("outputs", {}).values():
        for img in node_output.get("images", []):
            q = urllib.parse.urlencode({
                "filename": img["filename"],
                "subfolder": img.get("subfolder", ""),
                "type": img.get("type", "output"),
            })
            data = urllib.request.urlopen(f"http://{server}/view?{q}", timeout=120).read()
            path = Path(out_dir) / img["filename"]
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            saved.append(path)
    return saved


def to_webp(png_paths, size):
    from PIL import Image
    out = []
    for p in png_paths:
        im = Image.open(p)
        im.thumbnail((size, size), Image.LANCZOS)
        wp = p.with_suffix(".webp")
        im.save(wp, "WEBP", quality=90, method=6)
        out.append(wp)
    return out


def main():
    ap = argparse.ArgumentParser(description="ComfyUI API 極簡調用（stdlib only）")
    ap.add_argument("--server", default=DEFAULT_SERVER)
    ap.add_argument("--prompt", help="正面 prompt")
    ap.add_argument("--negative", default=DEFAULT_NEGATIVE)
    ap.add_argument("--ckpt", default=DEFAULT_CKPT, help="checkpoint 名（--list-models 睇）")
    ap.add_argument("--width", type=int, default=512)
    ap.add_argument("--height", type=int, default=512)
    ap.add_argument("--steps", type=int, default=20)
    ap.add_argument("--cfg", type=float, default=7.0)
    ap.add_argument("--seed", type=int, default=None, help="唔填就隨機")
    ap.add_argument("--out", default="comfyui-output", help="輸出文件夾")
    ap.add_argument("--timeout", type=int, default=600)
    ap.add_argument("--webp", action="store_true", help="順便轉 WebP")
    ap.add_argument("--webp-size", type=int, default=512)
    ap.add_argument("--list-models", action="store_true")
    ap.add_argument("--fetch", metavar="PROMPT_ID", help="攞返之前生成完嘅圖")
    args = ap.parse_args()

    if args.list_models:
        list_models(args.server)
        return

    if args.fetch:
        entry = wait_result(args.server, args.fetch, timeout=5)
        saved = download_images(args.server, entry, args.out)
        for p in saved:
            print("✅", p)
        return

    if not args.prompt:
        ap.error("要俾 --prompt（或者 --list-models / --fetch）")

    seed = args.seed if args.seed is not None else random.randint(0, 2**32 - 1)
    wf = build_workflow(args.prompt, args.negative, args.ckpt,
                        args.width, args.height, args.steps, args.cfg, seed)
    prompt_id = queue_prompt(args.server, wf)
    print(f"已排隊 prompt_id={prompt_id}（seed={seed}），生成緊……", flush=True)

    entry = wait_result(args.server, prompt_id, args.timeout)
    saved = download_images(args.server, entry, args.out)
    for p in saved:
        print("✅ 已儲存:", p)

    if args.webp and saved:
        for p in to_webp(saved, args.webp_size):
            print("✅ WebP:", p)


if __name__ == "__main__":
    main()
