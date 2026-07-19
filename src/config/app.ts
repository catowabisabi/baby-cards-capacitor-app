/**
 * BabyCards 全域設定
 * 所有你會想改嘅嘢都喺晒呢度：App 名、廣告 ID、訂閱價錢、BB 模式參數。
 */
export const APP_CONFIG = {
  appName: 'BabyCards 嬰兒認字咭',
  logo: 'brand/logo.webp',

  /** Loading 畫面最少顯示時間（毫秒） */
  loadingMinMs: 1200,

  ads: {
    /**
     * AdMob 廣告 ID —— 請換成你自己嘅！
     * 而家填嘅係 Google 官方測試 ID，正式發佈前一定要換。
     * 攞 ID：https://admob.google.com → 應用程式 → 廣告單元
     */
    androidBannerId: 'ca-app-pub-3940256099942544/6300978111',
    androidInterstitialId: 'ca-app-pub-3940256099942544/1033173712',
    iosBannerId: 'ca-app-pub-3940256099942544/2934735716',
    iosInterstitialId: 'ca-app-pub-3940256099942544/4411468910',

    /** 每睇幾多張卡出一次插頁廣告 */
    interstitialEvery: 10,
    /** 瀏覽器預覽用嘅模擬插頁廣告秒數（原生 App 入面由 AdMob 控制） */
    interstitialSeconds: 10,
  },

  premium: {
    price: 'US$1.99',
    period: '月',
    /** localStorage key，用嚟記住已訂閱狀態 */
    storageKey: 'babycards_premium',
  },

  bbMode: {
    /** 長按幾多毫秒先解鎖（音量下鍵或畫面鎖頭都係用呢個值） */
    unlockHoldMs: 3000,
  },
} as const;
