/**
 * 底部廣告 bar
 * 原生 App：真 AdMob banner 由原生層畫，呢度唔使畫（返 null）。
 * 瀏覽器預覽：顯示模擬 banner。訂閱後消失。
 */
import { Megaphone } from 'lucide-react';
import { usePremium } from '@/lib/premium';
import { useBbMode } from '@/lib/bbmode';
import { isNative } from '@/lib/ads';

export function AdBanner({ onUpgrade }: { onUpgrade: () => void }) {
  const premium = usePremium();
  const bbMode = useBbMode();
  if (premium || isNative) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex h-12 items-center justify-center gap-2 border-t border-slate-200 bg-slate-50/95 px-3 text-xs text-slate-500 backdrop-blur">
      <Megaphone className="h-4 w-4 shrink-0" />
      <span>廣告位置 · Google AdMob（預覽佔位）</span>
      {!bbMode && (
        <button
          onClick={onUpgrade}
          className="ml-1 rounded-full bg-amber-400 px-2.5 py-1 font-semibold text-amber-900 active:scale-95"
        >
          去除廣告
        </button>
      )}
    </div>
  );
}
