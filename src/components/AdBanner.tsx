import { Megaphone } from 'lucide-react';
import { useBbMode } from '@/lib/bbmode';
import { isNative } from '@/lib/ads';
import { usePremium } from '@/lib/premium';

export function AdBanner({ onUpgrade }: { onUpgrade: () => void }) {
  const premium = usePremium();
  const bbMode = useBbMode();
  if (premium || isNative) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex h-12 items-center justify-center gap-2 border-t border-slate-200 bg-slate-50/95 px-3 text-xs text-slate-500 backdrop-blur">
      <Megaphone className="h-4 w-4 shrink-0" />
      <span>廣告位置 · Google AdMob</span>
      {!bbMode && (
        <button
          onClick={onUpgrade}
          className="ml-1 rounded-full bg-amber-400 px-2.5 py-1 font-semibold text-amber-900 active:scale-95"
        >
          移除廣告
        </button>
      )}
    </div>
  );
}

