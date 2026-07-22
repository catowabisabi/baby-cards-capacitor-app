import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface HoldActionButtonProps {
  holdMs: number;
  onComplete: () => void;
  className: string;
  children: ReactNode;
  disabled?: boolean;
  ariaLabel: string;
  holdTitle: string;
}

export function HoldActionButton({
  holdMs,
  onComplete,
  className,
  children,
  disabled = false,
  ariaLabel,
  holdTitle,
}: HoldActionButtonProps) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const cancel = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setProgress(0);
  }, []);

  const tick = useCallback(
    (time: number) => {
      const next = Math.min(1, (time - startRef.current) / holdMs);
      setProgress(next);
      if (next >= 1) {
        cancel();
        onComplete();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [cancel, holdMs, onComplete]
  );

  const start = useCallback(() => {
    if (disabled || rafRef.current !== null) return;
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, tick]);

  useEffect(() => cancel, [cancel]);
  const remainingSeconds = Math.max(1, Math.ceil((holdMs * (1 - progress)) / 1000));

  return (
    <>
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onContextMenu={(event) => event.preventDefault()}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`relative overflow-hidden ${className}`}
      >
        <span
          className="pointer-events-none absolute inset-y-0 left-0 bg-white/35"
          style={{ width: `${progress * 100}%` }}
        />
        <span className="relative z-10 flex items-center justify-center gap-1.5">
          {children}
        </span>
      </button>

      {progress > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/15 px-6">
          <div className="rounded-3xl bg-white/95 px-8 py-6 text-center shadow-2xl">
            <p className="text-2xl font-black text-slate-800">{holdTitle}</p>
            <p className="mt-2 text-sm font-bold text-slate-500">
              請按緊 {remainingSeconds} 秒
            </p>
          </div>
        </div>
      )}
    </>
  );
}
