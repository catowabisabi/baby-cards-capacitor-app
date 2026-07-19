# BabyCards 嬰兒認字咭

一個用 Capacitor 打包嘅中英雙語 BB 學習卡 App：唔使登入，一張圖、一個英文詞、一個中文詞、英文音、中文音（廣東話）。

> 📦 **出 APK**：睇 [docs/BUILD_APK.md](docs/BUILD_APK.md)
> 💰 **AdMob + 會員訂閱設定**：睇 [docs/MONETIZATION.md](docs/MONETIZATION.md)

## 功能一覽

- **Loading 畫面**：logo + App 名（`public/brand/logo.webp`，想換圖直接換檔案）
- **主題頁**：`public/cards/` 入面每個子文件夾 = 一個主題，自動用第一張卡嘅圖做封面
- **9 個內置主題共 27 張卡**：動物、顏色、車車、生果、食物、屋企人、身體、衫褲、玩具
- **卡片頁**：大圖 + 英文詞 + 中文詞，入嚟自動播英文跟住中文；掂幅圖重播；左右掃或撳箭咀切卡
- **我的卡（自製卡）**：用戶可以自己整卡——upload 相（例如爸爸張相，自動縮做 512px WebP）、輸入中英文、upload mp3 或者用 app 即場錄音；可以編輯同刪除。資料存喺 IndexedDB，**淨係呢部機**：唔使登入、冇雲端 backup，刪 app / 清 app data 就會冇咗（唔刪就一世喺度）
- **廣告**：底部 AdMob banner + 每睇 10 張卡出一次插頁廣告（10 秒先閂得）
- **移除廣告**：US$1.99 / 月（而家係模擬購買，見下面「正式上架」）
- **BB 模式**：開咗之後鎖晒所有掣（返回、箭咀、喇叭、設定），小朋友淨係可以掂圖聽聲同掃 mon 切卡
  - 解鎖方法：**長按右下角鎖頭 3 秒**，或者**按住音量下鍵 3 秒**（音量鍵要原生 App 先得）

## 點樣加卡（重點！）

文件夾結構：

```
public/cards/
├── animals/              ← 文件夾名 = 主題 ID
│   ├── _topic.json       ← 主題名（可選）
│   ├── cat.png           ← 卡圖（透明 PNG 最靚）
│   ├── cat-en.mp3        ← 英文發音
│   ├── cat-cn.mp3        ← 中文發音（你自己錄嘅廣東話放喺度！）
│   └── cat.json          ← 卡文字
├── colors/
└── cars/
```

每張卡 4 個檔案（檔名要跟返張卡個名，例如 `apple`）：

| 檔案 | 內容 | 必須？ |
|---|---|---|
| `apple.png` | 卡圖，透明 PNG | ✅ 必須 |
| `apple.json` | `{ "en": "Apple", "cn": "蘋果" }` | ✅ 必須 |
| `apple-en.mp3` | 英文發音 | 可選（冇就用裝置語音合成讀） |
| `apple-cn.mp3` | 中文發音，錄廣東話就得 | 可選（冇就用裝置嘅 zh-HK 語音讀） |

主題名 `_topic.json`（可選）：

```json
{ "en": "Animals", "cn": "動物" }
```

**加新卡／新主題**：開文件夾、放檔案，然後跑：

```bash
npm run cards:manifest
```

（`npm run dev` 同 `npm run build` 都會自動跑一次。）冇需要嘅主題，直接刪文件夾再跑一次就得。

## 圖片格式建議

內置卡全部係 **512×512 WebP**（透明背景），成個 app 27 張卡連 logo 先 ~780KB，load 得好快。
你自己加卡時，建議都係用細尺寸 WebP/PNG（512px 左右就夠）；自製卡 upload 嘅相會自動壓縮，唔使操心。

## 廣告設定（AdMob）

廣告單元 ID 喺 `src/config/app.ts` 改：

```ts
ads: {
  androidBannerId: 'ca-app-pub-xxxx/bbbb',
  androidInterstitialId: 'ca-app-pub-xxxx/iiii',
  iosBannerId: 'ca-app-pub-xxxx/bbbb',
  iosInterstitialId: 'ca-app-pub-xxxx/iiii',
  interstitialEvery: 10,     // 每幾多張卡出一次插頁廣告
  interstitialSeconds: 10,   // 預覽版模擬廣告秒數
},
```

> ⚠️ 而家填咗嘅係 **Google 官方測試 ID**，正式發佈前一定要換成你自己嘅，否則會冇收入甚至俾 AdMob 停權。

打包原生時額外設定：

- **Android**：`android/app/src/main/AndroidManifest.xml` 加
  ```xml
  <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID"
             android:value="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"/>
  ```
- **iOS**：`ios/App/App/Info.plist` 加 `GADApplicationIdentifier`（你嘅 AdMob App ID）

瀏覽器預覽時，banner 同插頁廣告都係模擬畫面；原生 App 入面會自動改用真 AdMob。

## 打包原生 App（Capacitor）

```bash
npm install
npm run build
npx cap add ios        # 第一次先要
npx cap add android    # 第一次先要
npx cap sync
```

之後用 Xcode 開 `ios/`、Android Studio 開 `android/` 就可以 build 同簽名。

### BB 模式音量鍵解鎖

實體音量鍵喺瀏覽器聽唔到，原生 App 要裝多個插件：

```bash
npm install capacitor-volume-buttons
npx cap sync
```

相關代碼喺 `src/hooks/useVolumeUnlock.ts`，已經兼容常見嘅音量鍵插件事件格式；如果你用第隻插件，改呢一個檔案就得。畫面長按鎖頭解鎖喺任何環境都用得。

## 正式上架前要接嘅嘢

1. **真內購**：而家 US$1.99 訂閱係模擬（存 localStorage）。建議用 [RevenueCat](https://www.revenuecat.com/) 接 App Store / Google Play 訂閱，改 `src/lib/premium.ts` 入面嘅 `subscribe()` 同 `restorePurchases()` 就得，介面唔使郁。
2. **真 AdMob ID**：見上面「廣告設定」。
3. **錄廣東話**：將 `*-cn.mp3` 放入對應主題文件夾，再跑 `npm run cards:manifest`。

## 開發指令

```bash
npm run dev             # 本地開發（自動先生成 manifest）
npm run build           # 打包到 dist/（自動先生成 manifest）
npm run cards:manifest  # 手動重新掃描 cards 文件夾
```

## 技術結構

- React + TypeScript + Vite + Tailwind + shadcn/ui，Capacitor 打包 iOS / Android
- `scripts/generate-cards-manifest.mjs`：掃描 `public/cards/` 生成 `manifest.json`，瀏覽器冇權限列目錄，所以靠呢個清單
- `src/lib/audio.ts`：優先播 mp3，冇檔案用 Web Speech API fallback（中文 zh-HK、英文 en-US）
- `src/lib/ads.ts`：AdMob 原生整合 + 每 N 張卡計數
- `src/lib/premium.ts`：訂閱狀態（模擬）
- `src/lib/bbmode.ts` + `src/hooks/useVolumeUnlock.ts`：BB 模式
