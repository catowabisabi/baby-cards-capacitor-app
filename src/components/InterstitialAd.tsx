/**
 * 插頁廣告（每睇 10 張卡出一次）
 * 瀏覽器預覽用呢個模擬版本：10 秒倒數完先可以閂。
 * 原生 App 入面會改用真 AdMob 插頁廣告（見 src/lib/ads.ts）。
 */
import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { APP_CONFIG } from '@/config/app';

interface InterstitialAdProps {
  onClose: () => void;
  onUpgrade: () => void;
}

export function InterstitialAd({ onClose, onUpgrade }: InterstitialAdProps) {
  const total = APP_CONFIG.ads.interstitialSeconds;
  const [left, setLeft] = useState<number>(total);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setLeft((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => window.clearInterval(iv);
  }, []);

  const canClose = left <= 0;
  const progress = ((total - left) / total) * 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95">
      {/* 頂部：倒數 + 關閉 */}
      <div className="flex items-center justify-between p-4">
        <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-200">
          廣告 · {canClose ? '可以關閉喇' : `${left} 秒後可以關閉`}
        </span>
        <button
          onClick={canClose ? onClose : undefined}
          disabled={!canClose}
          aria-label="關閉廣告"
          className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
            canClose
              ? 'bg-white text-slate-900 active:scale-90'
              : 'cursor-not-allowed bg-slate-700 text-slate-500'
          }`}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 倒數進度條 */}
      <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 模擬廣告內容 */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-700">
          <Megaphone className="h-12 w-12 text-slate-400" />
        </div>
        <p className="text-lg font-semibold text-white">你嘅廣告會喺度出現</p>
        <p className="max-w-xs text-sm text-slate-400">
          原生 App 入面呢度係真 AdMob 插頁廣告；
          瀏覽器預覽用模擬畫面代替，倒數規則一樣。
        </p>
        <button
          onClick={onUpgrade}
          className="mt-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-amber-900 active:scale-95"
        >
          {APP_CONFIG.premium.price} / {APP_CONFIG.premium.period} · 畫面零廣告
        </button>
      </div>
    </div>
  );
}
