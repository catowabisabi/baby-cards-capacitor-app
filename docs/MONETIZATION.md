# 廣告（AdMob）+ 會員訂閱 設定教學

App 入面嘅代碼**已經寫好晒**，你要做嘅係開戶口、攞 ID、填返入去。

---

# 第一部：AdMob 廣告

## 1. 開 AdMob 戶口

1. 去 https://admob.google.com 用 Google 帳戶開戶
2. **應用程式 → 新增應用程式** → 揀 Android（iOS 就再開多個）
3. 開完會有一個 **App ID**，格式係 `ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy`

## 2. 開兩個廣告單元

喺個 app 入面 **廣告單元 → 新增廣告單元**：

| 廣告單元 | 格式 | 用喺 |
|---|---|---|
| Banner | 橫額 | 畫面底部條廣告 |
| Interstitial | 插頁式 | 每 10 張卡彈一次 |

每個單元有一個 ID，格式 `ca-app-pub-xxxxxxxxxxxxxxxx/nnnnnnnnnn`。

## 3. 填 ID 入 code

**廣告單元 ID** → `src/config/app.ts`：

```ts
ads: {
  androidBannerId: 'ca-app-pub-你的/banner',
  androidInterstitialId: 'ca-app-pub-你的/interstitial',
  iosBannerId: 'ca-app-pub-你的/ios-banner',
  iosInterstitialId: 'ca-app-pub-你的/ios-interstitial',
  interstitialEvery: 10,   // 每幾多張卡出一次，想改就改呢個
  interstitialSeconds: 10, // 預覽版模擬廣告秒數
},
```

**App ID** → `android/app/src/main/AndroidManifest.xml`（見 BUILD_APK.md 第四步）；
iOS 就喺 `ios/App/App/Info.plist` 加：

```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy</string>
```

> ⚠️ 而家 code 入面係 **Google 官方測試 ID**。測試階段用佢哋最好（唔會誤觸違規）；**正式上架前一定要換成自己嘅**，否則冇收入。
> 另外上 Google Play 後記得喺 AdMob 設定 **app-ads.txt**。

廣告邏輯喺 `src/lib/ads.ts`，唔使郁；瀏覽器預覽會繼續用模擬廣告。

---

# 第二部：會員訂閱（US$1.99/月 移除廣告）

而家訂閱係**模擬版**（撳咗就当買咗，存 localStorage）。
正式上架 Apple / Google 規定數碼內容一定要用佢哋嘅內購系統，
最省心嘅做法係用 **RevenueCat**（免費額夠細 app 用，一次過搞掂 Android + iOS）。

## 1. Google Play 開訂閱產品

1. 上 https://play.google.com/console 開發者戶口（一次過 US$25）
2. 上載咗個 app 先（內部測試 track 都得）
3. **營利 → 產品 → 訂閱項目 → 建立訂閱項目**
   - 產品 ID：`premium_monthly`
   - 基本方案：每月，US$1.99（可以設唔同地區價錢）

## 2. RevenueCat 設定

1. https://www.revenuecat.com 開戶 → **New project**
2. **Apps → + New → Google Play**：
   - 填 package name：`com.mono12studio.babycards`
   - 跟佢教學整一個 **Play 服務帳戶 JSON key** 上載（佢有 step-by-step）
   - 攞到 **Public SDK API Key**（`goog_xxxxxxxx`）
3. **Entitlements → 新建**：名 `premium`，掛上 `premium_monthly`
4. **Offerings → 新建**：名 `default`，加返個 monthly package

## 3. 裝插件

```bash
npm install @revenuecat/purchases-capacitor
npx cap sync
```

## 4. 換 `src/lib/premium.ts` 嘅實現

個檔頂部加：

```ts
import { Purchases } from '@revenuecat/purchases-capacitor';
```

`subscribe()` 同 `restorePurchases()` 換成：

```ts
/** App 啟動時 call 一次（例如 App.tsx 嘅啟動 useEffect） */
export async function initPurchases() {
  if (!Capacitor.isNativePlatform()) return;
  await Purchases.configure({ apiKey: 'goog_你的APIKey' });
  const { customerInfo } = await Purchases.getCustomerInfo();
  setPremium(typeof customerInfo.entitlements.active['premium'] !== 'undefined');
}

export async function subscribe(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    const pkg =
      offerings.current?.monthly ?? offerings.current?.availablePackages[0];
    if (!pkg) return false;
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const active =
      typeof customerInfo.entitlements.active['premium'] !== 'undefined';
    if (active) setPremium(true);
    return active;
  } catch {
    return false; // 用戶取消咗
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const active =
      typeof customerInfo.entitlements.active['premium'] !== 'undefined';
    setPremium(active);
    return active;
  } catch {
    return false;
  }
}
```

介面（訂閱 dialog、去廣告邏輯）**完全唔使改**——佢哋本來就係 call 呢幾個 function。

## 5. 測試

- Google Play Console → **設定 → 授權測試** 加你嘅 Gmail，測試戶口買嘢唔會真收費
- 將 APK 推上 **內部測試** track，用測試戶口裝嚟試買

## 6. iOS（遲啲做都得）

App Store Connect 開 subscription group + 同樣 `premium_monthly`，
RevenueCat 加個 iOS app（用 App Store Connect API key），
`Purchases.configure` 按平台揀 `appl_xxx` / `goog_xxx` key 就得。

---

## 常見問題

**Q：可唔可以唔用 RevenueCat？**
可以，直接 Google Play Billing / `cordova-plugin-purchase` 都得，
但你要自己處理收據驗證、跨平台、恢復購買，麻煩好多。

**Q：廣告同訂閱會唔會衝突？**
唔會。訂閱成功 → `setPremium(true)` → banner 收埋、每 10 張卡嘅插頁廣告停哂，
呢個邏輯已經喺 app 入面行緊。
