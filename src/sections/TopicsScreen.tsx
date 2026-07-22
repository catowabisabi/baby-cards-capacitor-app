import { useState } from 'react';
import { Baby, Ear, Eye, Gamepad2, Heart, Images, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { APP_CONFIG } from '@/config/app';
import { assetUrl } from '@/lib/assets';
import { setBbMode, useBbMode } from '@/lib/bbmode';
import { getRemainingFreeGamePlays } from '@/lib/gameUsage';
import type { MiniGameKind } from '@/sections/MiniGameScreen';
import type { Topic } from '@/types/card';

const TILE_COLORS = [
  'from-rose-100 to-rose-200 border-rose-300',
  'from-sky-100 to-sky-200 border-sky-300',
  'from-amber-100 to-amber-200 border-amber-300',
  'from-emerald-100 to-emerald-200 border-emerald-300',
  'from-violet-100 to-violet-200 border-violet-300',
  'from-orange-100 to-orange-200 border-orange-300',
];

interface TopicsScreenProps {
  topics: Topic[];
  onSelect: (topic: Topic) => void;
  onOpenPremium: () => void;
  userCardsCount: number;
  userCoverUrl: string | null;
  onSelectUser: () => void;
  onStartGame: (kind: MiniGameKind) => void;
  unlimitedGames: boolean;
}

export function TopicsScreen({
  topics,
  onSelect,
  onOpenPremium,
  userCardsCount,
  userCoverUrl,
  onSelectUser,
  onStartGame,
  unlimitedGames,
}: TopicsScreenProps) {
  const bbMode = useBbMode();
  const [tab, setTab] = useState<'cards' | 'games'>('cards');
  const remainingGames = getRemainingFreeGamePlays();

  const toggleBbMode = (value: boolean) => {
    setBbMode(value);
    if (value) {
      toast('BB 模式開咗', {
        description: '所有按鈕已鎖定。解鎖：長按右下角鎖頭 3 秒，或按住音量下鍵 3 秒。',
        duration: 5000,
      });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-amber-50 via-orange-50 to-rose-100 pb-16">
      <header className="flex items-center justify-between gap-2 px-4 pt-[max(env(safe-area-inset-top),1.5rem)]">
        <div className="flex items-center">
          <img
            src={assetUrl(APP_CONFIG.logo)}
            alt=""
            className="h-16 w-16 object-contain"
          />
        </div>
        {!bbMode && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 shadow-sm">
              <Baby className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-semibold text-slate-600">BB 模式</span>
              <Switch checked={bbMode} onCheckedChange={toggleBbMode} />
            </label>
            <button
              onClick={onOpenPremium}
              aria-label="設定"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm active:scale-90"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4">
        {!bbMode && (
          <div className="mb-4 grid grid-cols-2 rounded-2xl bg-white/80 p-1 shadow-sm">
            <button
              onClick={() => setTab('cards')}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black ${
                tab === 'cards' ? 'bg-orange-400 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              <Images className="h-4 w-4" />
              Cards
            </button>
            <button
              onClick={() => setTab('games')}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black ${
                tab === 'games' ? 'bg-orange-400 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              <Gamepad2 className="h-4 w-4" />
              Mini Games
            </button>
          </div>
        )}

        {tab === 'cards' || bbMode ? (
          <>
            <h2 className="text-xl font-black text-slate-700">揀個主題 · Pick a topic</h2>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <button
                onClick={onSelectUser}
                className="flex flex-col items-center rounded-3xl border-b-4 border-pink-300 bg-gradient-to-br from-pink-100 to-rose-200 p-4 shadow-sm transition active:scale-95"
              >
                {userCoverUrl ? (
                  <img
                    src={userCoverUrl}
                    alt="我的卡"
                    className="h-28 w-28 rounded-2xl object-contain drop-shadow-md"
                  />
                ) : (
                  <span className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-pink-300 bg-white/60">
                    <Heart className="h-12 w-12 text-pink-400" />
                  </span>
                )}
                <span className="mt-2 text-lg font-black text-slate-700">我的卡</span>
                <span className="text-sm font-semibold text-slate-500">My Cards</span>
                <span className="mt-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {userCardsCount > 0 ? `${userCardsCount} 張卡` : '自己整卡'}
                </span>
              </button>

              {topics.map((topic, i) => (
                <button
                  key={topic.id}
                  onClick={() => onSelect(topic)}
                  className={`flex flex-col items-center rounded-3xl border-b-4 bg-gradient-to-br p-4 shadow-sm transition active:scale-95 ${TILE_COLORS[i % TILE_COLORS.length]}`}
                >
                  <img
                  src={assetUrl(topic.cover)}
                  alt={topic.en}
                    className="h-28 w-28 rounded-2xl object-contain drop-shadow-md"
                  loading="lazy"
                />
                  <span className="mt-2 text-lg font-black text-slate-700">{topic.cn}</span>
                  <span className="text-sm font-semibold text-slate-500">{topic.en}</span>
                  <span className="mt-1 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {topic.cards.length} 張卡
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-xl font-black text-slate-700">Mini Games</h2>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
                {unlimitedGames ? '無限遊戲' : `今日剩 ${remainingGames} 次`}
              </span>
            </div>
            <div className="grid gap-4">
              {[
                { cn: '聽聲揀圖', en: 'Listen & Pick', game: 'listen-pick' as const, Icon: Ear },
                { cn: '睇圖揀字', en: 'Picture & Words', game: 'picture-pick' as const, Icon: Eye },
                { cn: '字母遊戲', en: 'Letters', game: 'letter-game' as const, Icon: Images },
                { cn: '顏色遊戲', en: 'Colors', game: 'color-game' as const, Icon: Eye },
                { cn: '加減遊戲', en: 'Numbers', game: 'number-math' as const, Icon: Gamepad2 },
              ].map(({ cn, en, game, Icon }) => (
                <button
                  key={en}
                  onClick={() => onStartGame(game)}
                  className="flex items-center gap-4 rounded-3xl border-b-4 border-emerald-300 bg-gradient-to-br from-emerald-100 to-sky-100 p-5 text-left shadow-sm active:scale-95"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-emerald-500">
                    <Icon className="h-7 w-7" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-black text-slate-700">{cn}</span>
                    <span className="block text-sm font-semibold text-slate-500">{en}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
