/**
 * 卡片頁
 * 一張圖 + 英文詞 + 中文詞；入到嚟自動播英文跟住中文。
 * 掂幅圖重播；左右掃或者撳箭咀切卡。
 * BB 模式：鎖晒箭咀、喇叭、返回掣，淨係可以掂圖同掃mon。
 */
import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, House, Volume2 } from 'lucide-react';
import { FlashCard } from '@/components/FlashCard';
import { playCard, stopAudio } from '@/lib/audio';
import { useBbMode } from '@/lib/bbmode';
import type { Topic } from '@/types/card';

interface CardsScreenProps {
  topic: Topic;
  onBack: () => void;
  onCardViewed: () => void;
}

const SWIPE_THRESHOLD = 60;

export function CardsScreen({ topic, onBack, onCardViewed }: CardsScreenProps) {
  const [index, setIndex] = useState(0);
  const bbMode = useBbMode();
  const touchStartX = useRef<number | null>(null);

  const card = topic.cards[index];
  const total = topic.cards.length;

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => (i + delta + total) % total);
    },
    [total]
  );

  // 每張卡：自動播發音 + 計一次「睇咗」（用嚟每 10 張出插頁廣告）
  useEffect(() => {
    onCardViewed();
    const t = window.setTimeout(() => {
      playCard(card, 'both');
    }, 300);
    return () => {
      window.clearTimeout(t);
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, topic.id]);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      go(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div
      className="flex min-h-dvh touch-pan-y flex-col bg-gradient-to-b from-amber-50 via-orange-50 to-rose-100 pb-16 select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* 頂部 bar：BB 模式冇返回掣 */}
      <header className="flex items-center justify-between px-4 pt-5">
        {!bbMode ? (
          <button
            onClick={onBack}
            aria-label="返回主題"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm active:scale-90"
          >
            <House className="h-5 w-5" />
          </button>
        ) : (
          <span className="h-11 w-11" />
        )}
        <div className="text-center">
          <p className="text-base font-black text-slate-700">{topic.cn}</p>
          <p className="text-xs font-semibold text-slate-400">{topic.en}</p>
        </div>
        <span className="flex h-11 min-w-11 items-center justify-center rounded-full bg-white/90 px-3 text-sm font-bold text-slate-500 shadow-sm">
          {index + 1}/{total}
        </span>
      </header>

      {/* 卡片本體 */}
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6">
        <FlashCard card={card} onTap={() => playCard(card, 'both')} />

        {/* 獨立發音掣（BB 模式鎖定） */}
        {!bbMode && (
          <div className="flex gap-3">
            <button
              onClick={() => playCard(card, 'en')}
              className="flex items-center gap-2 rounded-full border-b-4 border-sky-300 bg-sky-100 px-5 py-3 text-base font-black text-sky-700 active:scale-95"
            >
              <Volume2 className="h-5 w-5" />
              English
            </button>
            <button
              onClick={() => playCard(card, 'cn')}
              className="flex items-center gap-2 rounded-full border-b-4 border-rose-300 bg-rose-100 px-5 py-3 text-base font-black text-rose-700 active:scale-95"
            >
              <Volume2 className="h-5 w-5" />
              廣東話
            </button>
          </div>
        )}
      </main>

      {/* 上一張 / 下一張（BB 模式鎖定，用掃mon代替） */}
      {!bbMode && (
        <footer className="flex items-center justify-center gap-10 pb-4">
          <button
            onClick={() => go(-1)}
            aria-label="上一張"
            className="flex h-16 w-16 items-center justify-center rounded-full border-b-4 border-slate-300 bg-white text-slate-600 shadow-md active:scale-90"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <div className="flex gap-1.5">
            {topic.cards.map((c, i) => (
              <span
                key={c.id}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-5 bg-orange-400' : 'w-2 bg-slate-300'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => go(1)}
            aria-label="下一張"
            className="flex h-16 w-16 items-center justify-center rounded-full border-b-4 border-orange-300 bg-orange-400 text-white shadow-md active:scale-90"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </footer>
      )}
    </div>
  );
}
