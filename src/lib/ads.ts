/**
 * 廣告服務
 *
 * 原生 App（Capacitor）：用 @capacitor-community/admob 顯示真 AdMob 廣告。
 * 瀏覽器預覽：底部 banner 同插頁廣告都用模擬 UI 代替（邏輯一樣）。
 *
 * 想換廣告 ID → src/config/app.ts
 */
import { Capacitor } from '@capacitor/core';
import { APP_CONFIG } from '@/config/app';

export const isNative = Capacitor.isNativePlatform();

type AdmobModule = typeof import('@capacitor-community/admob');
let admob: AdmobModule | null = null;

function bannerId() {
  return Capacitor.getPlatform() === 'ios'
    ? APP_CONFIG.ads.iosBannerId
    : APP_CONFIG.ads.androidBannerId;
}

function interstitialId() {
  return Capacitor.getPlatform() === 'ios'
    ? APP_CONFIG.ads.iosInterstitialId
    : APP_CONFIG.ads.androidInterstitialId;
}

/** App 啟動時 call 一次 */
export async function initAds() {
  if (!isNative) return;
  try {
    admob = await import('@capacitor-community/admob');
    await admob.AdMob.initialize();
    await prepareInterstitial();
  } catch (e) {
    console.warn('[ads] AdMob 初始化失敗', e);
  }
}

/** 顯示底部 banner（原生先需要；瀏覽器嘅模擬 banner 由 React 畫） */
export async function showBanner() {
  if (!isNative || !admob) return;
  try {
    const { AdMob, BannerAdSize, BannerAdPosition } = admob;
    await AdMob.showBanner({
      adId: bannerId(),
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    });
  } catch (e) {
    console.warn('[ads] banner 顯示失敗', e);
  }
}

export async function hideBanner() {
  if (!isNative || !admob) return;
  try {
    await admob.AdMob.hideBanner();
  } catch {
    /* ignore */
  }
}

export async function prepareInterstitial() {
  if (!isNative || !admob) return;
  try {
    await admob.AdMob.prepareInterstitial({ adId: interstitialId() });
  } catch (e) {
    console.warn('[ads] 插頁廣告準備失敗', e);
  }
}

/**
 * 原生顯示真插頁廣告；瀏覽器回傳 false，由 caller 改用模擬 overlay。
 */
export async function showNativeInterstitial(): Promise<boolean> {
  if (!isNative || !admob) return false;
  try {
    await admob.AdMob.showInterstitial();
    // 播完預載下一次
    prepareInterstitial();
    return true;
  } catch (e) {
    console.warn('[ads] 插頁廣告顯示失敗', e);
    return false;
  }
}

/* ---- 每 N 張卡出一次插頁廣告嘅計數器 ---- */

const COUNT_KEY = 'babycards_card_views';

export function getCardViews(): number {
  try {
    return parseInt(localStorage.getItem(COUNT_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

/** 記錄睇咗一張卡，返返而家嘅累積張數 */
export function incrementCardViews(): number {
  const next = getCardViews() + 1;
  try {
    localStorage.setItem(COUNT_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function shouldShowInterstitial(count: number): boolean {
  return count > 0 && count % APP_CONFIG.ads.interstitialEvery === 0;
}
