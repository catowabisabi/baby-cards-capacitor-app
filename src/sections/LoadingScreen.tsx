/** 第一頁：Loading 畫面（logo + App 名） */
import { APP_CONFIG } from '@/config/app';
import { assetUrl } from '@/lib/assets';

export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-gradient-to-b from-amber-50 via-orange-50 to-rose-100 px-6">
      <img
        src={assetUrl(APP_CONFIG.logo)}
        alt={APP_CONFIG.appName}
        className="h-40 w-40 animate-[float_2.4s_ease-in-out_infinite] object-contain drop-shadow-xl"
      />
      <div className="text-center">
        <h1 className="text-3xl font-black tracking-wide text-orange-500">
          {APP_CONFIG.appName}
        </h1>
        <p className="mt-2 text-sm font-medium text-orange-300">
          一齊嚟認字啦 · Let's learn words
        </p>
      </div>
      <div className="flex gap-2.5" aria-label="載入中">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-3 w-3 animate-bounce rounded-full bg-orange-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
