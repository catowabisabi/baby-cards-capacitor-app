import { Capacitor } from '@capacitor/core';
import { APP_CONFIG } from '@/config/app';

export const isNative = Capacitor.isNativePlatform();

type AdmobModule = typeof import('@capacitor-community/admob');
let admob: AdmobModule | null = null;
let initPromise: Promise<void> | null = null;

function bannerId() {
  return Capacitor.getPlatform() === 'ios'
    ? APP_CONFIG.ads.iosBannerId
    : APP_CONFIG.ads.androidBannerId;
}

export async function initAds() {
  if (!isNative) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      admob = await import('@capacitor-community/admob');
      await admob.AdMob.initialize();
    } catch (e) {
      console.warn('[ads] AdMob init failed', e);
    }
  })();
  return initPromise;
}

export async function showBanner() {
  if (!isNative) return;
  await initAds();
  if (!admob) return;
  try {
    const { AdMob, BannerAdSize, BannerAdPosition } = admob;
    await AdMob.showBanner({
      adId: bannerId(),
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    });
  } catch (e) {
    console.warn('[ads] Banner failed to show', e);
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

const COUNT_KEY = 'babycards_card_views';

export function getCardViews(): number {
  try {
    return parseInt(localStorage.getItem(COUNT_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function incrementCardViews(): number {
  const next = getCardViews() + 1;
  try {
    localStorage.setItem(COUNT_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}
