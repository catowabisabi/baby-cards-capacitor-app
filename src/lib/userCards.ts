/**
 * 自製卡（我的卡）
 *
 * 用戶自己整嘅卡：相片 + 中英文 + 聲音（upload 或即場錄音）。
 * 全部存喺 IndexedDB——淨係呢部機、呢個 app：
 * 唔使登入、冇雲端 backup，刪 app / 清 app data 就會冇咗。
 */
import type { CardItem } from '@/types/card';
import { DB_VERSION, ensureBabyCardsStores } from '@/lib/cardOverrides';

export const USER_TOPIC_ID = 'my-cards';

export interface UserCardRecord {
  id: string;
  en: string;
  cn: string;
  image: Blob;
  audioEn: Blob | null;
  audioCn: Blob | null;
  createdAt: number;
}

const DB_NAME = 'babycards';
const STORE = 'userCards';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      ensureBabyCardsStores(req.result);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllUserCards(): Promise<UserCardRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve(
        (req.result as UserCardRecord[]).sort((a, b) => a.createdAt - b.createdAt)
      );
    req.onerror = () => reject(req.error);
  });
}

export async function saveUserCard(rec: UserCardRecord): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteUserCard(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** 用戶 upload 嘅相都縮做 512px WebP，保持 app 快、慳位（透明保留） */
export async function downscaleImage(
  file: Blob,
  maxSize = 512,
  quality = 0.85
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 唔支援');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('圖片處理失敗'))),
      'image/webp',
      quality
    );
  });
}

/** 將 DB record 轉做可以即用嘅 CardItem（object URL 由 caller 負責 revoke） */
export function toCardItem(rec: UserCardRecord): CardItem {
  return {
    id: rec.id,
    en: rec.en,
    cn: rec.cn,
    image: URL.createObjectURL(rec.image),
    audioEn: rec.audioEn ? URL.createObjectURL(rec.audioEn) : null,
    audioCn: rec.audioCn ? URL.createObjectURL(rec.audioCn) : null,
  };
}

export function revokeCardItem(item: CardItem) {
  URL.revokeObjectURL(item.image);
  if (item.audioEn) URL.revokeObjectURL(item.audioEn);
  if (item.audioCn) URL.revokeObjectURL(item.audioCn);
}

export function newUserCardId(): string {
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
