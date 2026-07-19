/**
 * BB 模式狀態
 * 開啟後：鎖晒所有按鈕（返回、設定、上一張/下一張、喇叭），
 * 小朋友淨係可以掂幅圖聽發音同掃mon切卡。
 * 解鎖方法：長按畫面鎖頭 3 秒，或者按住音量下鍵 3 秒。
 */
import { useSyncExternalStore } from 'react';

let state = false;
const listeners = new Set<() => void>();

export function setBbMode(value: boolean) {
  state = value;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useBbMode(): boolean {
  return useSyncExternalStore(subscribe, () => state);
}
