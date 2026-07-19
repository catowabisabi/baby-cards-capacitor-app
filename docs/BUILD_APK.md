# 點樣 Build APK（Android 安裝檔）

呢個 project 用 Capacitor，個 webapp build 出嚟之後包落原生 Android app。
成個流程大約 15–30 分鐘（第一次裝嘢耐啲）。

---

## 第一步：裝齊工具（只做一次）

喺**你自己部電腦**度裝：

1. **Node.js 20+** → https://nodejs.org
2. **Android Studio** → https://developer.android.com/studio
   - 裝嘅時候跟預設，會順便裝埋 Android SDK、JDK
3. 開 Android Studio → **More Actions → SDK Manager**，確認有：
   - Android SDK Platform（最新 API level）
   - Android SDK Build-Tools

## 第二步：拎 code + build web 部分

```bash
git clone git@github.com:catowabisabi/baby-cards-capacitor-app.git
cd baby-cards-capacitor-app
npm install
npm run build        # 自動掃描 cards 文件夾 + 打包去 dist/
```

## 第三步：加入 Android 平台（只做一次）

```bash
npx cap add android
npx cap sync
```

`android/` 文件夾就係完整嘅 Android Studio 項目。

## 第四步：填 AdMob App ID（重要！未填會閃退）

開 `android/app/src/main/AndroidManifest.xml`，喺 `<application>` 入面加：

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"/>
```

（`ca-app-pub-xxx~yyy` 係你嘅 AdMob **App ID**，唔係廣告單元 ID。
未開 AdMob 戶口可以先填 Google 測試 ID：`ca-app-pub-3940256099942544~3347511713`）

## 第五步：出 APK

### 方法 A：Android Studio（推薦）

```bash
npx cap open android     # 會用 Android Studio 開個項目
```

等佢 sync 完（第一次要 download 啲嘢，幾分鐘），然後：

- **試機用（debug APK）**：
  頂部 menu → **Build → Build Bundle(s) / APK(s) → Build APK(s)**
  完成後撈右下角提示嘅 **locate**，個檔喺：
  `android/app/build/outputs/apk/debug/app-debug.apk`
  掉入電話就裝得（電話要開「允許未知來源」）。

- **正式發佈（release APK / AAB）**：
  **Build → Generate Signed App Bundle or APK** → 揀 **APK**（自己派）或者 **Android App Bundle (.aab)**（上 Google Play 一定要用 AAB）→ **Create new...** 整一個 keystore
  ⚠️ **keystore 檔案同密碼一定要keep 好**，唔見咗就世世代代更新唔到個 app！
  → 揀 **release** → Finish，輸出喺 `android/app/build/outputs/apk/release/`。

### 方法 B：命令行

```bash
cd android
./gradlew assembleDebug       # debug APK
# Windows 用： gradlew.bat assembleDebug
```

APK 位置：`android/app/build/outputs/apk/debug/app-debug.apk`

## 之後改完嘢點更新？

```bash
npm run build     # 重新打包 web 部分
npx cap sync      # 抄入 android 項目
```

然後再用 Android Studio / gradlew 出 APK。
上 Google Play 嘅話，記得每次都要喺 `android/app/build.gradle` 加 `versionCode`（整數，逐次 +1）同改 `versionName`。

## iOS 嘅話呢？

流程一樣，不過要 Mac + Xcode + Apple Developer 戶口（US$99/年）：

```bash
npx cap add ios
npx cap sync
npx cap open ios    # Xcode 開，揀你嘅 Team 就可以 Archive 上 App Store
```
