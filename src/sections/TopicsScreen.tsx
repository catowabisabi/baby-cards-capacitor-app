/** 第二頁：主題頁（cards/ 每個子文件夾 = 一個主題，封面係第一張卡嘅圖） */
import { Baby, Heart, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { APP_CONFIG } from '@/config/app';
import { assetUrl } from '@/lib/assets';
import { setBbMode, useBbMode } from '@/lib/bbmode';
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
  /** 自製卡數量同封面（冇卡時 coverUrl 係 null） */
  userCardsCount: number;
  userCoverUrl: string | null;
  onSelectUser: () => void;
}

export function TopicsScreen({
  topics,
  onSelect,
  onOpenPremium,
  userCardsCount,
  userCoverUrl,
  onSelectUser,
}: TopicsScreenProps) {
  const bbMode = useBbMode();

  const toggleBbMode = (v: boolean) => {
    setBbMode(v);
    if (v) {
      toast('BB 模式開咗 👶', {
        description: '所有按鈕已鎖定。解鎖：長按右下角鎖頭 3 秒，或按住音量下鍵 3 秒。',
        duration: 5000,
      });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-amber-50 via-orange-50 to-rose-100 pb-16">
      {/* 頂部 bar（BB 模式下鎖定收起） */}
      <header className="flex items-center justify-between gap-2 px-4 pt-5">
        <div className="flex items-center gap-2">
          <img
            src={assetUrl(APP_CONFIG.logo)}
            alt=""
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-black text-orange-500">{APP_CONFIG.appName}</span>
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

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-6">
        <h2 className="text-xl font-black text-slate-700">揀個主題 · Pick a topic</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {/* 我的卡（自製卡）—— 永遠擺第一 */}
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
                className="h-28 w-28 object-contain drop-shadow-md"
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
      </main>
    </div>
  );
}
