import { useCallback, useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';
import { AdBanner } from '@/components/AdBanner';
import { InterstitialAd } from '@/components/InterstitialAd';
import { PremiumDialog } from '@/components/PremiumDialog';
import { UnlockHold } from '@/components/UnlockHold';
import { APP_CONFIG } from '@/config/app';
import {
  hideBanner,
  incrementCardViews,
  initAds,
  shouldShowInterstitial,
  showBanner,
  showNativeInterstitial,
} from '@/lib/ads';
import { assetUrl } from '@/lib/assets';
import { setBbMode, useBbMode } from '@/lib/bbmode';
import { isPremium, usePremium } from '@/lib/premium';
import { getAllUserCards, type UserCardRecord } from '@/lib/userCards';
import { useVolumeUnlock } from '@/hooks/useVolumeUnlock';
import { CardsScreen } from '@/sections/CardsScreen';
import { LoadingScreen } from '@/sections/LoadingScreen';
import { TopicsScreen } from '@/sections/TopicsScreen';
import { UserCardsScreen } from '@/sections/UserCardsScreen';
import type { CardsManifest, Topic } from '@/types/card';

type Screen = 'loading' | 'topics' | 'cards' | 'my-cards';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [interstitialOpen, setInterstitialOpen] = useState(false);
  const [userRecords, setUserRecords] = useState<UserCardRecord[]>([]);
  const [userCoverUrl, setUserCoverUrl] = useState<string | null>(null);
  const premium = usePremium();
  const bbMode = useBbMode();

  /* 自製卡：從 IndexedDB 載入（封面用第一張卡嘅相） */
  const refreshUserCards = useCallback(async () => {
    try {
      const recs = await getAllUserCards();
      setUserRecords(recs);
      setUserCoverUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return recs.length > 0 ? URL.createObjectURL(recs[0].image) : null;
      });
    } catch (e) {
      console.warn('自製卡載入失敗', e);
    }
  }, []);

  /* 啟動：載入 cards manifest + 初始化廣告 + loading 最少顯示時間 */
  useEffect(() => {
    let alive = true;
    const start = Date.now();
    (async () => {
      let loaded: Topic[] = [];
      try {
        const res = await fetch(assetUrl('cards/manifest.json'));
        const manifest = (await res.json()) as CardsManifest;
        loaded = manifest.topics;
      } catch (e) {
        console.error('cards manifest 載入失敗', e);
        toast.error('卡片資料載入失敗，請檢查 cards 文件夾');
      }
      void initAds();
      void refreshUserCards();
      const wait = Math.max(0, APP_CONFIG.loadingMinMs - (Date.now() - start));
      await new Promise((r) => setTimeout(r, wait));
      if (!alive) return;
      setTopics(loaded);
      setScreen('topics');
    })();
    return () => {
      alive = false;
    };
  }, [refreshUserCards]);

  /* 訂閱後收埋原生 banner */
  useEffect(() => {
    if (premium) void hideBanner();
    else void showBanner();
  }, [premium]);

  /* BB 模式：擋返回鍵 + 禁用長按選取/右鍵 */
  useEffect(() => {
    if (!bbMode) return;
    const trap = () => window.history.pushState({ bb: Date.now() }, '');
    trap();
    window.addEventListener('popstate', trap);
    document.body.classList.add('bb-lock');
    return () => {
      window.removeEventListener('popstate', trap);
      document.body.classList.remove('bb-lock');
    };
  }, [bbMode]);

  const unlock = useCallback(() => {
    setBbMode(false);
    toast.success('BB 模式已解鎖 🔓');
  }, []);
  useVolumeUnlock(bbMode, unlock);

  /* 每 10 張卡出一次插頁廣告（訂閱用戶豁免） */
  const handleCardViewed = useCallback(() => {
    if (isPremium()) return;
    const count = incrementCardViews();
    if (shouldShowInterstitial(count)) {
      void showNativeInterstitial().then((shown) => {
        if (!shown) setInterstitialOpen(true);
      });
    }
  }, []);

  const openTopic = (t: Topic) => {
    setTopic(t);
    setScreen('cards');
  };

  return (
    <>
      {screen === 'loading' && <LoadingScreen />}

      {screen === 'topics' && (
        <TopicsScreen
          topics={topics}
          onSelect={openTopic}
          onOpenPremium={() => setPremiumOpen(true)}
          userCardsCount={userRecords.length}
          userCoverUrl={userCoverUrl}
          onSelectUser={() => setScreen('my-cards')}
        />
      )}

      {screen === 'cards' && topic && (
        <CardsScreen
          topic={topic}
          onBack={() => setScreen('topics')}
          onCardViewed={handleCardViewed}
        />
      )}

      {screen === 'my-cards' && (
        <UserCardsScreen
          records={userRecords}
          onBack={() => setScreen('topics')}
          onCardViewed={handleCardViewed}
          onChanged={refreshUserCards}
        />
      )}

      {/* 廣告同訂閱 */}
      <AdBanner onUpgrade={() => setPremiumOpen(true)} />
      {interstitialOpen && (
        <InterstitialAd
          onClose={() => setInterstitialOpen(false)}
          onUpgrade={() => {
            setInterstitialOpen(false);
            setPremiumOpen(true);
          }}
        />
      )}
      <PremiumDialog open={premiumOpen} onOpenChange={setPremiumOpen} />

      {/* BB 模式解鎖掣（任何畫面都喺度） */}
      {bbMode && <UnlockHold onUnlock={unlock} />}

      <Toaster richColors position="top-center" />
    </>
  );
}
