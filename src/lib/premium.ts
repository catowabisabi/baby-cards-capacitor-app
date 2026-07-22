import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  LOG_LEVEL,
  PAYWALL_RESULT,
  Purchases,
  type CustomerInfo,
} from '@revenuecat/purchases-capacitor';
import { RevenueCatUI } from '@revenuecat/purchases-capacitor-ui';
import { APP_CONFIG } from '@/config/app';

export interface SubscriptionAccess {
  configured: boolean;
  loading: boolean;
  noAds: boolean;
  unlimitedGames: boolean;
  customerInfo: CustomerInfo | null;
  error: string | null;
}

const LEGACY_PREMIUM_KEY = APP_CONFIG.premium.storageKey;
const NO_ADS_ENTITLEMENT = APP_CONFIG.revenueCat.noAdsEntitlementId;
const UNLIMITED_ENTITLEMENT = APP_CONFIG.revenueCat.unlimitedEntitlementId;

const nativePlatform = Capacitor.isNativePlatform();
let configurePromise: Promise<void> | null = null;
let customerInfoListenerId: string | null = null;

let state: SubscriptionAccess = {
  configured: false,
  loading: true,
  noAds: readLegacyPremium(),
  unlimitedGames: false,
  customerInfo: null,
  error: null,
};

const listeners = new Set<() => void>();

function readLegacyPremium() {
  try {
    return localStorage.getItem(LEGACY_PREMIUM_KEY) === '1';
  } catch {
    return false;
  }
}

function emit(next: Partial<SubscriptionAccess>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function accessFromCustomerInfo(customerInfo: CustomerInfo) {
  const active = customerInfo.entitlements.active;
  const unlimitedGames = Boolean(active[UNLIMITED_ENTITLEMENT]?.isActive);
  const noAds = unlimitedGames || Boolean(active[NO_ADS_ENTITLEMENT]?.isActive) || readLegacyPremium();
  return { noAds, unlimitedGames };
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Subscription service failed';
}

export async function initRevenueCat() {
  if (configurePromise) return configurePromise;

  configurePromise = (async () => {
    try {
      if (!nativePlatform) {
        await Purchases.setMockWebResults({ shouldMockWebResults: true });
        await RevenueCatUI.setMockWebResults?.({ shouldMockWebResults: true });
      }

      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      await Purchases.configure({
        apiKey: APP_CONFIG.revenueCat.apiKey,
        appUserID: null,
      });

      customerInfoListenerId = await Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        emit({
          configured: true,
          loading: false,
          customerInfo,
          error: null,
          ...accessFromCustomerInfo(customerInfo),
        });
      });

      await refreshCustomerInfo();
    } catch (error) {
      console.warn('[revenuecat] init failed', error);
      emit({
        configured: false,
        loading: false,
        error: errorMessage(error),
      });
    }
  })();

  return configurePromise;
}

export async function cleanupRevenueCat() {
  if (!customerInfoListenerId) return;
  try {
    await Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: customerInfoListenerId });
  } catch {
    /* ignore */
  }
  customerInfoListenerId = null;
}

export async function refreshCustomerInfo() {
  const { customerInfo } = await Purchases.getCustomerInfo();
  emit({
    configured: true,
    loading: false,
    customerInfo,
    error: null,
    ...accessFromCustomerInfo(customerInfo),
  });
  return customerInfo;
}

export async function presentSubscriptionPaywall() {
  await initRevenueCat();
  try {
    const { result } = await RevenueCatUI.presentPaywall({
      displayCloseButton: true,
    });
    if (
      result === PAYWALL_RESULT.PURCHASED ||
      result === PAYWALL_RESULT.RESTORED ||
      result === PAYWALL_RESULT.NOT_PRESENTED
    ) {
      await refreshCustomerInfo();
    }
    return result;
  } catch (error) {
    emit({ error: errorMessage(error), loading: false });
    throw error;
  }
}

export async function presentUnlimitedPaywallIfNeeded() {
  await initRevenueCat();
  try {
    const { result } = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: UNLIMITED_ENTITLEMENT,
      displayCloseButton: true,
    });
    await refreshCustomerInfo();
    return result;
  } catch (error) {
    emit({ error: errorMessage(error), loading: false });
    throw error;
  }
}

export async function presentCustomerCenter() {
  await initRevenueCat();
  await RevenueCatUI.presentCustomerCenter();
  await refreshCustomerInfo();
}

export async function restorePurchases() {
  await initRevenueCat();
  const { customerInfo } = await Purchases.restorePurchases();
  emit({
    configured: true,
    loading: false,
    customerInfo,
    error: null,
    ...accessFromCustomerInfo(customerInfo),
  });
  return state.noAds || state.unlimitedGames;
}

export function isPremium() {
  return state.noAds;
}

export function hasUnlimitedGames() {
  return state.unlimitedGames;
}

function subscribeListener(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSubscriptionAccess(): SubscriptionAccess {
  return useSyncExternalStore(subscribeListener, () => state);
}

export function usePremium(): boolean {
  return useSyncExternalStore(subscribeListener, () => state.noAds);
}

export function useUnlimitedGames(): boolean {
  return useSyncExternalStore(subscribeListener, () => state.unlimitedGames);
}
