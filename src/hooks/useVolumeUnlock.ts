/**
 * 音量下鍵長按 3 秒解鎖（BB 模式用）
 *
 * 瀏覽器冇權限聽實體音量鍵，所以呢個 hook 會喺原生 Capacitor 環境
 * 先至有反應；畫面上嘅長按鎖頭係任何環境都用得嘅 fallback。
 *
 * 原生方面需要裝一個音量鍵插件，例如 capacitor-volume-buttons：
 *   npm install capacitor-volume-buttons
 * 唔同插件嘅 event 名可能唔同，下面已經兼容常見格式；
 * 如果你用嘅插件 API 唔一樣，改呢一個檔案就得。
 */
import { useEffect } from 'react';
import { APP_CONFIG } from '@/config/app';

interface VolumePluginHandle {
  remove: () => void;
}

interface VolumeEvent {
  direction?: string;
  button?: string;
  pressed?: boolean;
  type?: string;
}

export function useVolumeUnlock(enabled: boolean, onUnlock: () => void) {
  useEffect(() => {
    if (!enabled) return;

    let timer: number | null = null;
    let handle: VolumePluginHandle | null = null;
    let cancelled = false;

    const startHold = () => {
      if (timer !== null) return;
      timer = window.setTimeout(() => {
        timer = null;
        onUnlock();
      }, APP_CONFIG.bbMode.unlockHoldMs);
    };

    const cancelHold = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const isDownButton = (e: VolumeEvent) =>
      e.direction === 'down' || e.button === 'down' || e.type === 'down';

    const setup = async () => {
      try {
        const plugins = (
          window as unknown as {
            Capacitor?: { Plugins?: Record<string, unknown> };
          }
        ).Capacitor?.Plugins;
        const volumeButtons = plugins?.VolumeButtons as
          | {
              addListener: (
                event: string,
                cb: (e: VolumeEvent) => void
              ) => Promise<VolumePluginHandle>;
            }
          | undefined;
        if (!volumeButtons?.addListener) return;

        const listener = await volumeButtons.addListener(
          'volumeButtonPressed',
          (e: VolumeEvent) => {
            if (!isDownButton(e)) return;
            // pressed === false 代表放手；冇呢個欄位就當按下（開始計時）
            if (e.pressed === false) cancelHold();
            else startHold();
          }
        );
        if (cancelled) listener.remove();
        else handle = listener;
      } catch {
        // 冇插件 / 非原生環境：靜靜哋略過，畫面長按鎖頭一樣用到
      }
    };

    setup();

    return () => {
      cancelled = true;
      cancelHold();
      handle?.remove();
    };
  }, [enabled, onUnlock]);
}
