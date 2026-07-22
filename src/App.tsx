import { useCallback, useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { toast, Toaster } from 'sonner';
import { AdBanner } from '@/components/AdBanner';
import { PremiumDialog } from '@/components/PremiumDialog';
import { UnlockHold } from '@/components/UnlockHold';
import { APP_CONFIG } from '@/config/app';
import {
  hideBanner,
  incrementCardViews,
  initAds,
  showBanner,
} from '@/lib/ads';
import { assetUrl } from '@/lib/assets';
import { setBbMode, useBbMode } from '@/lib/bbmode';
import { applyCardOverrides, revokeTopicOverrideUrls } from '@/lib/cardOverrides';
import {
  hasUnlimitedGames,
  initRevenueCat,
  isPremium,
  usePremium,
  useUnlimitedGames,
} from '@/lib/premium';
import { canStartFreeGame, recordGameStart } from '@/lib/gameUsage';
import { getAllUserCards, type UserCardRecord } from '@/lib/userCards';
import { useVolumeUnlock } from '@/hooks/useVolumeUnlock';
import { CardsScreen } from '@/sections/CardsScreen';
import { LoadingScreen } from '@/sections/LoadingScreen';
import { MiniGameScreen, type MiniGameKind } from '@/sections/MiniGameScreen';
import { TopicsScreen } from '@/sections/TopicsScreen';
import { UserCardsScreen } from '@/sections/UserCardsScreen';
import type { CardsManifest, Topic } from '@/types/card';

type Screen = 'loading' | 'topics' | 'cards' | 'my-cards' | 'mini-game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [manifestTopics, setManifestTopics] = useState<Topic[]>([]);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [miniGameKind, setMiniGameKind] = useState<MiniGameKind>('listen-pick');
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [userRecords, setUserRecords] = useState<UserCardRecord[]>([]);
  const [userCoverUrl, setUserCoverUrl] = useState<string | null>(null);
  const premium = usePremium();
  const unlimitedGames = useUnlimitedGames();
  const bbMode = useBbMode();

  const refreshUserCards = useCallback(async () => {
    try {
      const recs = await getAllUserCards();
      setUserRecords(recs);
      setUserCoverUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return recs.length > 0 ? URL.createObjectURL(recs[0].image) : null;
      });
    } catch (e) {
      console.warn('User cards failed to load', e);
    }
  }, []);

  const refreshCardOverrides = useCallback(async () => {
    if (manifestTopics.length === 0) return;
    const withOverrides = await applyCardOverrides(manifestTopics);
    setTopics((previous) => {
      revokeTopicOverrideUrls(previous);
      return withOverrides;
    });
    setTopic((current) => {
      if (!current) return current;
      return withOverrides.find((nextTopic) => nextTopic.id === current.id) ?? current;
    });
  }, [manifestTopics]);

  useEffect(() => {
    let alive = true;
    const start = Date.now();
    (async () => {
      let loaded: Topic[] = [];
      try {
        const res = await fetch(assetUrl('data/manifest.json'));
        const manifest = (await res.json()) as CardsManifest;
        loaded = manifest.topics;
      } catch (e) {
        console.error('Cards manifest failed to load', e);
        toast.error('卡片資料載入失敗，請檢查 data 文件夾');
      }
      void initAds();
      void initRevenueCat();
      void refreshUserCards();
      const wait = Math.max(0, APP_CONFIG.loadingMinMs - (Date.now() - start));
      await new Promise((resolve) => setTimeout(resolve, wait));
      if (!alive) return;
      setManifestTopics(loaded);
      setTopics(await applyCardOverrides(loaded));
      setScreen('topics');
    })();
    return () => {
      alive = false;
    };
  }, [refreshUserCards]);

  useEffect(() => {
    return () => revokeTopicOverrideUrls(topics);
  }, [topics]);

  useEffect(() => {
    if (premium) void hideBanner();
    else void showBanner();
  }, [premium]);

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

  useEffect(() => {
    let remove: (() => void) | undefined;
    void CapacitorApp.addListener('backButton', () => {
      if (bbMode) return;
      if (screen === 'cards' || screen === 'my-cards' || screen === 'mini-game') {
        setScreen('topics');
        return;
      }
      if (screen === 'topics') void CapacitorApp.exitApp();
    }).then((handle) => {
      remove = () => {
        void handle.remove();
      };
    });
    return () => remove?.();
  }, [bbMode, screen]);

  const unlock = useCallback(() => {
    setBbMode(false);
    toast.success('BB 模式已解鎖');
  }, []);
  useVolumeUnlock(bbMode, unlock);

  const handleCardViewed = useCallback(() => {
    if (isPremium()) return;
    incrementCardViews();
  }, []);

  const openTopic = (nextTopic: Topic) => {
    setTopic(nextTopic);
    setScreen('cards');
  };

  const startMiniGame = (kind: MiniGameKind) => {
    const unlimited = hasUnlimitedGames();
    if (!canStartFreeGame(unlimited)) {
      setPremiumOpen(true);
      toast.info('今日免費遊戲次數已用完，明日 12 點後會重新計算');
      return;
    }
    const remaining = recordGameStart(unlimited);
    if (!unlimited) {
      toast(`今日仲可以免費玩 ${remaining} 次`);
    }
    setMiniGameKind(kind);
    setScreen('mini-game');
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
          unlimitedGames={unlimitedGames}
          onStartGame={startMiniGame}
        />
      )}

      {screen === 'cards' && topic && (
        <CardsScreen
          topic={topic}
          onBack={() => setScreen('topics')}
          onCardViewed={handleCardViewed}
          onCardsChanged={refreshCardOverrides}
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

      {screen === 'mini-game' && (
        <MiniGameScreen
          kind={miniGameKind}
          topics={topics}
          onBack={() => setScreen('topics')}
        />
      )}

      <AdBanner onUpgrade={() => setPremiumOpen(true)} />
      <PremiumDialog open={premiumOpen} onOpenChange={setPremiumOpen} />

      {bbMode && <UnlockHold onUnlock={unlock} />}

      <Toaster richColors position="top-center" />
    </>
  );
}
