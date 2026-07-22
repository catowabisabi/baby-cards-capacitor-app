import { APP_CONFIG } from '@/config/app';

interface DailyGameUsage {
  day: string;
  count: number;
}

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function emptyUsage(): DailyGameUsage {
  return { day: todayKey(), count: 0 };
}

export function getDailyGameUsage(): DailyGameUsage {
  try {
    const raw = localStorage.getItem(APP_CONFIG.games.usageStorageKey);
    if (!raw) return emptyUsage();
    const parsed = JSON.parse(raw) as Partial<DailyGameUsage>;
    if (parsed.day !== todayKey()) return emptyUsage();
    return {
      day: parsed.day,
      count: Math.max(0, Number(parsed.count) || 0),
    };
  } catch {
    return emptyUsage();
  }
}

function saveDailyGameUsage(usage: DailyGameUsage) {
  try {
    localStorage.setItem(APP_CONFIG.games.usageStorageKey, JSON.stringify(usage));
  } catch {
    /* ignore */
  }
}

export function getRemainingFreeGamePlays() {
  const usage = getDailyGameUsage();
  return Math.max(0, APP_CONFIG.games.freePlaysPerDay - usage.count);
}

export function canStartFreeGame(unlimitedGames: boolean) {
  return unlimitedGames || getRemainingFreeGamePlays() > 0;
}

export function recordGameStart(unlimitedGames: boolean) {
  if (unlimitedGames) return getRemainingFreeGamePlays();
  const usage = getDailyGameUsage();
  const next = {
    ...usage,
    count: Math.min(APP_CONFIG.games.freePlaysPerDay, usage.count + 1),
  };
  saveDailyGameUsage(next);
  return Math.max(0, APP_CONFIG.games.freePlaysPerDay - next.count);
}
