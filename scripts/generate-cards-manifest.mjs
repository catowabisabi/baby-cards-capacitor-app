/**
 * BabyCards — cards manifest 生成器
 *
 * 掃描 public/cards/ 入面每個子文件夾（每個 = 一個主題），
 * 根據命名規則組成卡片資料，輸出 public/cards/manifest.json。
 *
 * 文件夾規則（以 animals/apple 為例）：
 *   apple.png      卡片圖片（透明 PNG 最佳，亦支援 jpg/webp/gif/svg）
 *   apple-en.mp3   英文發音（可選，冇就用裝置語音合成 fallback）
 *   apple-cn.mp3   中文發音（可選，你可以錄廣東話放喺度）
 *   apple.json     卡片文字：{ "en": "Apple", "cn": "蘋果" }
 *   _topic.json    主題名稱（可選）：{ "en": "Animals", "cn": "動物" }
 *
 * 想加新主題？直接開個新文件夾放卡入去，再跑一次呢個腳本
 * （npm run dev / build 會自動跑）。主題封面 = 文件夾入面第一張卡嘅圖。
 */
import fs from 'node:fs';
import path from 'node:path';

const cardsDir = path.resolve(process.cwd(), 'public/cards');
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

if (!fs.existsSync(cardsDir)) {
  console.error(`搵唔到 ${cardsDir}`);
  process.exit(1);
}

const topics = [];

const topicDirs = fs
  .readdirSync(cardsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

for (const topicId of topicDirs) {
  const dir = path.join(cardsDir, topicId);
  const files = fs.readdirSync(dir);
  const has = (name) => files.includes(name);

  let topicMeta = {};
  if (has('_topic.json')) {
    try {
      topicMeta = JSON.parse(fs.readFileSync(path.join(dir, '_topic.json'), 'utf8'));
    } catch {
      console.warn(`⚠ ${topicId}/_topic.json 格式有問題，用預設名稱`);
    }
  }

  const cards = [];
  const jsonFiles = files
    .filter((f) => f.endsWith('.json') && f !== '_topic.json')
    .sort();

  for (const file of jsonFiles) {
    const id = path.basename(file, '.json');
    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    } catch {
      console.warn(`⚠ ${topicId}/${file} 格式有問題，跳過`);
      continue;
    }

    // 搵圖片：json 指定 > 同名檔案 > 任何以 id 開頭嘅圖
    let image = null;
    if (data.image && has(data.image)) {
      image = data.image;
    } else {
      for (const ext of IMAGE_EXTS) {
        if (has(`${id}${ext}`)) {
          image = `${id}${ext}`;
          break;
        }
      }
      if (!image) {
        image = files.find(
          (f) => f.startsWith(id) && IMAGE_EXTS.includes(path.extname(f).toLowerCase())
        );
      }
    }
    if (!image) {
      console.warn(`⚠ ${topicId}/${id} 冇圖片，跳過`);
      continue;
    }

    cards.push({
      id,
      en: data.en ?? id,
      cn: data.cn ?? id,
      image: `cards/${topicId}/${image}`,
      audioEn: has(`${id}-en.mp3`) ? `cards/${topicId}/${id}-en.mp3` : null,
      audioCn: has(`${id}-cn.mp3`) ? `cards/${topicId}/${id}-cn.mp3` : null,
    });
  }

  if (cards.length === 0) {
    console.warn(`⚠ 主題 ${topicId} 冇任何卡，略過`);
    continue;
  }

  topics.push({
    id: topicId,
    en: topicMeta.en ?? topicId,
    cn: topicMeta.cn ?? topicId,
    cover: cards[0].image, // 用第一張卡嘅圖做主題封面
    cards,
  });
}

const manifest = { generatedAt: new Date().toISOString(), topics };
fs.writeFileSync(path.join(cardsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(
  `✓ manifest.json 已生成：${topics.length} 個主題，共 ${topics.reduce((n, t) => n + t.cards.length, 0)} 張卡`
);
