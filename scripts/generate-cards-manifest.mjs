import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'public/data');
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];
const AUDIO_EXTS = ['.wav', '.mp3', '.flac', '.m4a', '.aac'];
const fileCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

if (!fs.existsSync(dataDir)) {
  console.error(`Cannot find ${dataDir}`);
  process.exit(1);
}

const firstExisting = (files, names) => names.find((name) => files.includes(name)) ?? null;

const topics = [];
const topicDirs = fs
  .readdirSync(dataDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const topicId of topicDirs) {
  const dir = path.join(dataDir, topicId);
  const files = fs.readdirSync(dir);
  const has = (name) => files.includes(name);

  let topicMeta = {};
  if (has('_topic.json')) {
    try {
      topicMeta = JSON.parse(fs.readFileSync(path.join(dir, '_topic.json'), 'utf8'));
    } catch {
      console.warn(`Invalid ${topicId}/_topic.json; using fallback topic names.`);
    }
  }

  const cards = [];
  const jsonFiles = files
    .filter((file) => file.endsWith('.json') && file !== '_topic.json')
    .sort((a, b) => fileCollator.compare(path.basename(a, '.json'), path.basename(b, '.json')));

  for (const file of jsonFiles) {
    const id = path.basename(file, '.json');
    let data = {};

    try {
      data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    } catch {
      console.warn(`Invalid ${topicId}/${file}; skipping.`);
      continue;
    }

    let image = null;
    if (data.image && has(data.image)) {
      image = data.image;
    } else {
      image =
        firstExisting(
          files,
          IMAGE_EXTS.map((ext) => `${id}${ext}`)
        ) ??
        files.find(
          (candidate) =>
            candidate.startsWith(id) &&
            IMAGE_EXTS.includes(path.extname(candidate).toLowerCase())
        );
    }

    if (!image) {
      console.warn(`Missing image for ${topicId}/${id}; skipping.`);
      continue;
    }

    const audioEn = firstExisting(
      files,
      AUDIO_EXTS.map((ext) => `${id}-en${ext}`)
    );
    const audioCn = firstExisting(
      files,
      AUDIO_EXTS.map((ext) => `${id}-cn${ext}`)
    );

    cards.push({
      id,
      en: data.en ?? id,
      cn: data.cn ?? id,
      image: `data/${topicId}/${image}`,
      audioEn: audioEn ? `data/${topicId}/${audioEn}` : null,
      audioCn: audioCn ? `data/${topicId}/${audioCn}` : null,
    });
  }

  if (cards.length === 0) {
    console.warn(`Topic ${topicId} has no cards; skipping.`);
    continue;
  }

  topics.push({
    id: topicId,
    en: topicMeta.en ?? topicId,
    cn: topicMeta.cn ?? topicId,
    cover: cards[0].image,
    cards,
  });
}

const manifest = { generatedAt: new Date().toISOString(), topics };
fs.writeFileSync(path.join(dataDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(
  `manifest.json generated: ${topics.length} topics, ${topics.reduce(
    (count, topic) => count + topic.cards.length,
    0
  )} cards`
);
