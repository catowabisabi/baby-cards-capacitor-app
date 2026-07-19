import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 設定
 * 打包原生 App：
 *   npm run build
 *   npx cap add ios        # 第一次
 *   npx cap add android    # 第一次
 *   npx cap sync
 * 之後用 Xcode / Android Studio 開 ios/ 或 android/ 就得。
 *
 * AdMob 額外設定：
 *   iOS     → ios/App/App/Info.plist 加 GADApplicationIdentifier（你嘅 AdMob App ID）
 *   Android → android/app/src/main/AndroidManifest.xml 加
 *             <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID"
 *                        android:value="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"/>
 * 廣告單元 ID 喺 src/config/app.ts 改。
 */
const config: CapacitorConfig = {
  appId: 'com.babycards.app',
  appName: 'BabyCards 嬰兒認字咭',
  webDir: 'dist',
  backgroundColor: '#fff7ed',
};

export default config;
