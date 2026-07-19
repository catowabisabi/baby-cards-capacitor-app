/**
 * BB 模式解鎖掣
 * 長按 3 秒解鎖（同音量下鍵長按 3 秒並行）。
 * 個掣細細粒、半透明，唔會引小朋友掂。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { APP_CONFIG } from '@/config/app';

const SIZE = 56;
const R = 24;
const CIRC = 2 * Math.PI * R;

export function UnlockHold({ onUnlock }: { onUnlock: () => void }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);
  const holdMs = APP_CONFIG.bbMode.unlockHoldMs;

  const cancel = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setProgress(0);
  }, []);

  const tick = useCallback(
    (t: number) => {
      const p = Math.min(1, (t - startRef.current) / holdMs);
      setProgress(p);
      if (p >= 1) {
        cancel();
        onUnlock();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [holdMs, cancel, onUnlock]
  );

  const start = useCallback(() => {
    if (rafRef.current !== null) return;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => cancel, [cancel]);

  return (
    <div className="fixed bottom-16 right-3 z-50 flex flex-col items-center gap-1">
      <button
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="長按 3 秒解鎖 BB 模式"
        className="relative flex items-center justify-center rounded-full bg-slate-800/40 text-white backdrop-blur-sm active:bg-slate-800/60"
        style={{ width: SIZE, height: SIZE }}
      >
        <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={3}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
          />
        </svg>
        <Lock className="h-5 w-5" />
      </button>
      <span className="rounded bg-slate-800/40 px-1.5 py-0.5 text-[10px] text-white/90">
        長按 3 秒解鎖
      </span>
    </div>
  );
}
