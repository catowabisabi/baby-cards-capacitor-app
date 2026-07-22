import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  House,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  Volume2,
} from 'lucide-react';
import { CardEditor } from '@/components/CardEditor';
import { CardThumbStrip } from '@/components/CardThumbStrip';
import { FlashCard } from '@/components/FlashCard';
import { HoldActionButton } from '@/components/HoldActionButton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { playCard, stopAudio } from '@/lib/audio';
import { cardKey, loadBookmarks, saveBookmarks } from '@/lib/bookmarks';
import { useBbMode } from '@/lib/bbmode';
import {
  deleteUserCard,
  revokeCardItem,
  toCardItem,
  USER_TOPIC_ID,
  type UserCardRecord,
} from '@/lib/userCards';

const SWIPE_THRESHOLD = 60;

function shuffleCards<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

interface UserCardsScreenProps {
  records: UserCardRecord[];
  onBack: () => void;
  onCardViewed: () => void;
  onChanged: () => void;
}

export function UserCardsScreen({
  records,
  onBack,
  onCardViewed,
  onChanged,
}: UserCardsScreenProps) {
  const [index, setIndex] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<UserCardRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bookmarks, setBookmarks] = useState(() => loadBookmarks());
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [randomOrder, setRandomOrder] = useState(true);
  const [autoPlaying, setAutoPlaying] = useState(true);
  const bbMode = useBbMode();
  const touchStartX = useRef<number | null>(null);

  const items = useMemo(() => records.map(toCardItem), [records]);
  useEffect(() => {
    return () => items.forEach(revokeCardItem);
  }, [items]);

  const orderedItems = useMemo(
    () => (randomOrder ? shuffleCards(items) : items),
    [items, randomOrder]
  );

  const visibleItems = useMemo(
    () =>
      showBookmarksOnly
        ? orderedItems.filter((item) => bookmarks.has(cardKey(USER_TOPIC_ID, item.id)))
        : orderedItems,
    [bookmarks, orderedItems, showBookmarksOnly]
  );

  const total = visibleItems.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const card = total > 0 ? visibleItems[safeIndex] : null;
  const currentRecord = card ? records.find((record) => record.id === card.id) ?? null : null;

  useEffect(() => {
    setIndex((current) => (total === 0 ? 0 : Math.min(current, total - 1)));
  }, [total]);

  const go = useCallback(
    (delta: number) => {
      if (total > 0) setIndex((i) => (i + delta + total) % total);
    },
    [total]
  );

  useEffect(() => {
    if (!card) return;
    onCardViewed();
    if (!autoPlaying) return;
    let cancelled = false;
    let nextTimer: number | null = null;
    const t = window.setTimeout(() => {
      void (async () => {
        await playCard(card, 'both');
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
  }, [autoPlaying, card?.id, go, total]);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
  };

  const toggleBookmark = () => {
    if (!card) return;
    setBookmarks((current) => {
      const next = new Set(current);
      const key = cardKey(USER_TOPIC_ID, card.id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveBookmarks(next);
      return next;
    });
  };

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = () => {
    setEditing(currentRecord);
    setEditorOpen(true);
  };

  const handleDelete = async () => {
    if (!currentRecord) return;
    await deleteUserCard(currentRecord.id);
    setConfirmDelete(false);
    setIndex((i) => Math.max(0, Math.min(i, records.length - 2)));
    onChanged();
  };

  const bookmarked = card ? bookmarks.has(cardKey(USER_TOPIC_ID, card.id)) : false;

  return (
    <div
      className="flex min-h-dvh touch-pan-y flex-col bg-gradient-to-b from-rose-50 via-pink-50 to-amber-100 pb-16 select-none"
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
          <p className="truncate text-base font-black text-slate-700">我的卡</p>
          <p className="truncate text-xs font-semibold text-slate-400">My Cards</p>
        </div>
        <span className="flex h-11 min-w-11 items-center justify-center rounded-full bg-white/90 px-3 text-sm font-bold text-slate-500 shadow-sm">
          {total > 0 ? `${safeIndex + 1}/${total}` : '0'}
        </span>
      </header>

      {!bbMode && (
        <div className="mx-auto mt-3 flex w-full max-w-sm flex-wrap items-center justify-between gap-2 px-4">
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
          <div className="flex gap-2">
            <button
              onClick={openNew}
              aria-label="新增"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-400 text-white shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
            </button>
            {card && (
              <>
                <HoldActionButton
                  holdMs={3000}
                  onComplete={openEdit}
                  ariaLabel="長按 3 秒編輯"
                  holdTitle="編輯"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-slate-600 shadow-sm active:scale-95"
                >
                  <Pencil className="h-4 w-4" />
                </HoldActionButton>
                <button
                  onClick={() => setConfirmDelete(true)}
                  aria-label="刪除"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-rose-500 shadow-sm active:scale-95"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {card ? (
        <>
          <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-4">
            <FlashCard
              card={card}
              onTap={() => playCard(card, 'both')}
              bookmarked={bookmarked}
              onToggleBookmark={bbMode ? undefined : toggleBookmark}
            />

            {!bbMode && (
              <>
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
              </>
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
              <CardThumbStrip cards={visibleItems} index={safeIndex} onSelect={setIndex} />
            </footer>
          )}
        </>
      ) : (
        <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <p className="text-lg font-black text-slate-600">
            {showBookmarksOnly ? '未有書簽' : '未有自己的卡'}
          </p>
          <p className="max-w-xs text-sm text-slate-400">
            {showBookmarksOnly
              ? '關閉篩選就會見返全部自製卡。'
              : 'Upload 相片，輸入中英文，再錄返把聲。'}
          </p>
          {!bbMode && !showBookmarksOnly && (
            <button
              onClick={openNew}
              className="flex h-32 w-32 flex-col items-center justify-center gap-1 rounded-full border-4 border-dashed border-orange-300 bg-white/70 text-orange-400 active:scale-95"
            >
              <Plus className="h-10 w-10" />
              <span className="text-xs font-bold">整第一張</span>
            </button>
          )}
        </main>
      )}

      <CardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
        onSaved={onChanged}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-xs rounded-3xl text-center">
          <DialogHeader>
            <DialogTitle>刪除呢張卡？</DialogTitle>
            <DialogDescription>刪咗就冇得返轉頭。</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              className="h-14 flex-1 rounded-xl"
            >
              取消
            </Button>
            <HoldActionButton
              holdMs={5000}
              onComplete={handleDelete}
              ariaLabel="長按 5 秒確認刪除"
              holdTitle="刪除"
              className="h-14 flex-1 rounded-xl bg-rose-500 font-bold text-white hover:bg-rose-400"
            >
              <Trash2 className="h-5 w-5" />
            </HoldActionButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
