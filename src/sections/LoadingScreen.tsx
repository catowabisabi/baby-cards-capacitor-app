import { APP_CONFIG } from '@/config/app';
import { assetUrl } from '@/lib/assets';

export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-7 bg-gradient-to-b from-amber-50 via-orange-50 to-rose-100 px-6">
      <img
        src={assetUrl(APP_CONFIG.logo)}
        alt={APP_CONFIG.appName}
        className="h-56 w-56 animate-[float_2.4s_ease-in-out_infinite] object-contain drop-shadow-xl"
      />
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

