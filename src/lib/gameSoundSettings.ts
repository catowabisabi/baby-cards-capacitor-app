import { useSyncExternalStore } from 'react';
import { DB_VERSION, ensureBabyCardsStores } from '@/lib/cardOverrides';

export type GameSoundCategory =
  | 'question-en'
  | 'question-cn'
  | 'correct-en'
  | 'correct-cn'
  | 'wrong-en'
  | 'wrong-cn';
export type GameSoundMode = 'default' | 'custom' | 'off';

export interface CustomGameSound {
  id: string;
  category: GameSoundCategory;
  blob: Blob;
  createdAt: number;
}

const DB_NAME = 'babycards';
const STORE = 'gameResponseSounds';
const MODE_KEY = 'babycards_game_sound_modes';

const DEFAULT_MODES: Record<GameSoundCategory, GameSoundMode> = {
  'question-en': 'default',
  'question-cn': 'default',
  'correct-en': 'default',
  'correct-cn': 'default',
  'wrong-en': 'default',
  'wrong-cn': 'default',
};

const listeners = new Set<() => void>();
let modeState: Record<GameSoundCategory, GameSoundMode> = readModes();

function readModes(): Record<GameSoundCategory, GameSoundMode> {
  try {
    const raw = localStorage.getItem(MODE_KEY);
    return { ...DEFAULT_MODES, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...DEFAULT_MODES };
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadGameSoundModes(): Record<GameSoundCategory, GameSoundMode> {
  return modeState;
}

export function getGameSoundMode(category: GameSoundCategory): GameSoundMode {
  return loadGameSoundModes()[category] ?? 'default';
}

export function setGameSoundMode(category: GameSoundCategory, mode: GameSoundMode) {
  const next = { ...modeState, [category]: mode };
  try {
    localStorage.setItem(MODE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  modeState = next;
  notify();
}

export function useGameSoundModes() {
  return useSyncExternalStore(subscribe, loadGameSoundModes);
}

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

export async function getCustomGameSounds(category: GameSoundCategory): Promise<CustomGameSound[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const index = tx.objectStore(STORE).index('category');
    const req = index.getAll(category);
    req.onsuccess = () =>
      resolve((req.result as CustomGameSound[]).sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function saveCustomGameSound(category: GameSoundCategory, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      id: `${category}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      category,
      blob,
      createdAt: Date.now(),
    } satisfies CustomGameSound);
    tx.oncomplete = () => {
      notify();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCustomGameSound(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => {
      notify();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function pickCustomGameSound(category: GameSoundCategory): Promise<Blob | null> {
  const sounds = await getCustomGameSounds(category);
  if (sounds.length === 0) return null;
  return sounds[Math.floor(Math.random() * sounds.length)].blob;
}
