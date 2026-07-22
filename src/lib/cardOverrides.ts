import type { CardItem, Topic } from '@/types/card';

export interface CardOverrideRecord {
  id: string;
  topicId: string;
  cardId: string;
  image: Blob | null;
  audioEn: Blob | null;
  audioCn: Blob | null;
  updatedAt: number;
}

export interface AppliedOverrideUrls {
  image?: string;
  audioEn?: string;
  audioCn?: string;
}

const DB_NAME = 'babycards';
export const DB_VERSION = 3;
const STORE = 'cardOverrides';
const USER_CARD_STORE = 'userCards';
const GAME_SOUND_STORE = 'gameResponseSounds';

export function overrideId(topicId: string, cardId: string) {
  return `${topicId}/${cardId}`;
}

export function ensureBabyCardsStores(db: IDBDatabase) {
  if (!db.objectStoreNames.contains(USER_CARD_STORE)) {
    db.createObjectStore(USER_CARD_STORE, { keyPath: 'id' });
  }
  if (!db.objectStoreNames.contains(GAME_SOUND_STORE)) {
    const store = db.createObjectStore(GAME_SOUND_STORE, { keyPath: 'id' });
    store.createIndex('category', 'category', { unique: false });
  }
  if (!db.objectStoreNames.contains(STORE)) {
    const store = db.createObjectStore(STORE, { keyPath: 'id' });
    store.createIndex('topicId', 'topicId', { unique: false });
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => ensureBabyCardsStores(req.result);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCardOverride(
  topicId: string,
  cardId: string
): Promise<CardOverrideRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(overrideId(topicId, cardId));
    req.onsuccess = () => resolve((req.result as CardOverrideRecord | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCardOverride(rec: CardOverrideRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    if (!rec.image && !rec.audioEn && !rec.audioCn) store.delete(rec.id);
    else store.put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function resetCardOverride(
  topicId: string,
  cardId: string,
  field?: 'image' | 'audioEn' | 'audioCn'
): Promise<void> {
  const existing = await getCardOverride(topicId, cardId);
  if (!existing) return;
  if (!field) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(existing.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  await saveCardOverride({ ...existing, [field]: null, updatedAt: Date.now() });
}

export async function applyCardOverrides(topics: Topic[]): Promise<Topic[]> {
  const db = await openDb();
  const overrides = await new Promise<CardOverrideRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as CardOverrideRecord[]);
    req.onerror = () => reject(req.error);
  });
  const byId = new Map(overrides.map((rec) => [rec.id, rec]));

  return topics.map((topic) => {
    const cards = topic.cards.map((card): CardItem => {
      const rec = byId.get(overrideId(topic.id, card.id));
      const defaults = {
        defaultImage: card.defaultImage ?? card.image,
        defaultAudioEn: card.defaultAudioEn ?? card.audioEn,
        defaultAudioCn: card.defaultAudioCn ?? card.audioCn,
      };
      if (!rec) return { ...card, ...defaults };
      return {
        ...card,
        ...defaults,
        image: rec.image ? URL.createObjectURL(rec.image) : defaults.defaultImage,
        audioEn: rec.audioEn ? URL.createObjectURL(rec.audioEn) : defaults.defaultAudioEn,
        audioCn: rec.audioCn ? URL.createObjectURL(rec.audioCn) : defaults.defaultAudioCn,
        hasImageOverride: Boolean(rec.image),
        hasAudioEnOverride: Boolean(rec.audioEn),
        hasAudioCnOverride: Boolean(rec.audioCn),
      };
    });
    return {
      ...topic,
      cover: cards[0]?.image ?? topic.cover,
      cards,
    };
  });
}

export function revokeTopicOverrideUrls(topics: Topic[]) {
  for (const topic of topics) {
    for (const card of topic.cards) {
      if (card.hasImageOverride) URL.revokeObjectURL(card.image);
      if (card.hasAudioEnOverride && card.audioEn) URL.revokeObjectURL(card.audioEn);
      if (card.hasAudioCnOverride && card.audioCn) URL.revokeObjectURL(card.audioCn);
    }
  }
}
