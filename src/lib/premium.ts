/**
 * 訂閱（移除廣告）狀態
 *
 * 而家係模擬版：訂閱狀態存喺 localStorage。
 * 正式上架時，將 subscribe() 入面嘅實現換成真正嘅內購
 * （建議用 RevenueCat：https://www.revenuecat.com/ 或
 *  capacitor-plugin-purchase），介面同流程唔使改。
 */
import { useSyncExternalStore } from 'react';
import { APP_CONFIG } from '@/config/app';

const KEY = APP_CONFIG.premium.storageKey;

let state = false;
try {
  state = localStorage.getItem(KEY) === '1';
} catch {
  /* ignore */
}

const listeners = new Set<() => void>();

export function isPremium() {
  return state;
}

export function setPremium(value: boolean) {
  state = value;
  try {
    if (value) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

/**
 * 模擬訂閱流程。正式版喺呢度接 RevenueCat / Store 內購，
 * 成功後一樣係 call setPremium(true)。
 */
export async function subscribe(): Promise<boolean> {
  // 假裝同商店傾計……
  await new Promise((r) => setTimeout(r, 1200));
  setPremium(true);
  return true;
}

/** 模擬恢復購買 */
export async function restorePurchases(): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 800));
  return isPremium();
}

function subscribeListener(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function usePremium(): boolean {
  return useSyncExternalStore(subscribeListener, () => state);
}
