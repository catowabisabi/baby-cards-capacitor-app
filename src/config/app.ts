export const APP_CONFIG = {
  appName: '文文認字',
  playStoreName: 'BabyCards 文文認字',
  logo: 'brand/logo - 2.png',

  loadingMinMs: 1200,

  ads: {
    androidBannerId: 'ca-app-pub-3940256099942544/6300978111',
    iosBannerId: 'ca-app-pub-3940256099942544/2934735716',
  },

  premium: {
    noAdsPrice: 'US$1.99',
    unlimitedPrice: 'US$2.99',
    period: '月',
    storageKey: 'babycards_premium',
  },

  revenueCat: {
    apiKey: 'test_AZpXseqxDAxRILMSJFUSGLALbFa',
    unlimitedEntitlementId: 'BabyCards 文文認字 Unlimited',
    noAdsEntitlementId: 'BabyCards 文文認字 No Ads',
    products: {
      monthly: 'monthly',
      yearly: 'yearly',
    },
  },

  games: {
    freePlaysPerDay: 10,
    usageStorageKey: 'babycards_daily_game_usage',
  },

  bbMode: {
    unlockHoldMs: 3000,
  },
} as const;
