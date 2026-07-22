import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, House, Pause, Pencil, Play, Volume2 } from 'lucide-react';
import { BuiltInCardEditor } from '@/components/BuiltInCardEditor';
import { CardThumbStrip } from '@/components/CardThumbStrip';
import { FlashCard } from '@/components/FlashCard';
import { HoldActionButton } from '@/components/HoldActionButton';
import { Switch } from '@/components/ui/switch';
import { cardKey, loadBookmarks, saveBookmarks } from '@/lib/bookmarks';
import { playCard, stopAudio } from '@/lib/audio';
import { useBbMode } from '@/lib/bbmode';
import type { Topic } from '@/types/card';

interface CardsScreenProps {
  topic: Topic;
  onBack: () => void;
  onCardViewed: () => void;
  onCardsChanged: () => void;
}

const SWIPE_THRESHOLD = 60;

function shuffleCards<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function CardsScreen({ topic, onBack, onCardViewed, onCardsChanged }: CardsScreenProps) {
  const [index, setIndex] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState(() => loadBookmarks());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [randomOrder, setRandomOrder] = useState(true);
  const [orderedCards, setOrderedCards] = useState(() => shuffleCards(topic.cards));
  const [autoPlaying, setAutoPlaying] = useState(true);
  const bbMode = useBbMode();
  const touchStartX = useRef<number | null>(null);
  const isLetters = topic.id === 'letters';

  useEffect(() => {
    setOrderedCards(randomOrder ? shuffleCards(topic.cards) : topic.cards);
    setIndex(0);
  }, [randomOrder, topic.cards, topic.id]);

  const visibleCards = useMemo(
    () =>
      showBookmarksOnly
        ? orderedCards.filter((card) => bookmarks.has(cardKey(topic.id, card.id)))
        : orderedCards,
    [bookmarks, orderedCards, showBookmarksOnly, topic.id]
  );
  const total = visibleCards.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const card = total > 0 ? visibleCards[safeIndex] : null;

  useEffect(() => {
    setIndex(0);
    setShowBookmarksOnly(false);
    setRandomOrder(topic.id !== 'letters');
    setAutoPlaying(true);
  }, [topic.id]);

  useEffect(() => {
    setIndex((current) => (total === 0 ? 0 : Math.min(current, total - 1)));
  }, [total]);

  const go = useCallback(
    (delta: number) => {
      if (total > 0) setIndex((i) => (i + delta + total) % total);
    },
    [total]
  );

  const toggleBookmark = () => {
    if (!card) return;
    setBookmarks((current) => {
      const next = new Set(current);
      const key = cardKey(topic.id, card.id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveBookmarks(next);
      return next;
    });
  };

  useEffect(() => {
    if (!card) return;
    onCardViewed();
    if (!autoPlaying) return;
    let cancelled = false;
    let nextTimer: number | null = null;
    const t = window.setTimeout(() => {
      void (async () => {
        await playCard(card, isLetters ? 'en' : 'both');
        if (cancelled || total <= 1) return;
        nextTimer = window.setTimeout(() => {
          if (!cancelled) go(1);
        }, 3000);
      })();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      if (nextTimer !== null) window.clearTimeout(nextTimer);
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlaying, card?.id, go, isLetters, onCardViewed, topic.id, total]);

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

  const bookmarked = card ? bookmarks.has(cardKey(topic.id, card.id)) : false;

  return (
    <div
      className="flex min-h-dvh touch-pan-y flex-col bg-gradient-to-b from-amber-50 via-orange-50 to-rose-100 pb-16 select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),1.5rem)]">
        <button
          onClick={onBack}
          aria-label="返回主頁"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm active:scale-90"
        >
          <House className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-base font-black text-slate-700">{topic.cn}</p>
          <p className="truncate text-xs font-semibold text-slate-400">{topic.en}</p>
        </div>
        <span className="flex h-11 min-w-11 items-center justify-center rounded-full bg-white/90 px-3 text-sm font-bold text-slate-500 shadow-sm">
          {total > 0 ? `${safeIndex + 1}/${total}` : '0'}
        </span>
      </header>

      {!bbMode && (
        <div className="mx-auto mt-3 flex w-full max-w-sm flex-wrap justify-between gap-2 px-4">
          <label className="flex items-center gap-2 rounded-full bg-white/85 px-3 py-2 shadow-sm">
            <span className="text-xs font-semibold text-slate-600">只顯示書簽</span>
            <Switch checked={showBookmarksOnly} onCheckedChange={setShowBookmarksOnly} />
          </label>
          <label className="flex items-center gap-2 rounded-full bg-white/85 px-3 py-2 shadow-sm">
            <span className="text-xs font-semibold text-slate-600">隨機</span>
            <Switch checked={randomOrder} onCheckedChange={setRandomOrder} />
          </label>
          <button
            onClick={() => {
              setAutoPlaying((value) => !value);
              stopAudio();
            }}
            aria-label={autoPlaying ? '暫停自動播放' : '開始自動播放'}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-slate-600 shadow-sm active:scale-95"
          >
            {autoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          {card && (
            <HoldActionButton
              holdMs={3000}
              onComplete={() => setEditorOpen(true)}
              ariaLabel="長按 3 秒編輯"
              holdTitle="編輯"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-slate-600 shadow-sm active:scale-95"
            >
              <Pencil className="h-4 w-4" />
            </HoldActionButton>
          )}
        </div>
      )}

      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-4">
        {card ? (
          <>
            <FlashCard
              card={card}
              onTap={() => playCard(card, isLetters ? 'en' : 'both')}
              bookmarked={bookmarked}
              onToggleBookmark={bbMode ? undefined : toggleBookmark}
              showCaption={!isLetters}
            />

            {!bbMode && (
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => playCard(card, 'en')}
                  className="flex items-center gap-2 rounded-full border-b-4 border-sky-300 bg-sky-100 px-5 py-3 text-base font-black text-sky-700 active:scale-95"
                >
                  <Volume2 className="h-5 w-5" />
                  English
                </button>
                {!isLetters && (
                  <button
                    onClick={() => playCard(card, 'cn')}
                    className="flex items-center gap-2 rounded-full border-b-4 border-rose-300 bg-rose-100 px-5 py-3 text-base font-black text-rose-700 active:scale-95"
                  >
                    <Volume2 className="h-5 w-5" />
                    廣東話
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-3xl bg-white/80 px-6 py-8 text-center shadow-sm">
            <p className="text-lg font-black text-slate-600">未有書簽</p>
            <p className="mt-2 text-sm font-semibold text-slate-400">關閉篩選就會見返全部卡片。</p>
          </div>
        )}
      </main>

      {!bbMode && total > 0 && (
        <footer className="pb-3">
          <div className="mb-3 flex items-center justify-center gap-8">
            <button
              onClick={() => go(-1)}
              aria-label="上一張"
              className="flex h-14 w-14 items-center justify-center rounded-full border-b-4 border-slate-300 bg-white text-slate-600 shadow-md active:scale-90"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="下一張"
              className="flex h-14 w-14 items-center justify-center rounded-full border-b-4 border-orange-300 bg-orange-400 text-white shadow-md active:scale-90"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </div>
          <CardThumbStrip cards={visibleCards} index={safeIndex} onSelect={setIndex} />
        </footer>
      )}

      <BuiltInCardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        topicId={topic.id}
        card={card}
        onSaved={onCardsChanged}
      />
    </div>
  );
}
