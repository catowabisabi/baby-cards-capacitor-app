/**
 * 我的卡（自製卡）
 * 同普通卡片頁一樣睇法，另外（非 BB 模式）可以新增、編輯、刪除。
 * 資料全部喺 IndexedDB，淨係呢部機。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  House,
  Pencil,
  Plus,
  Trash2,
  Volume2,
} from 'lucide-react';
import { CardEditor } from '@/components/CardEditor';
import { FlashCard } from '@/components/FlashCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { playCard, stopAudio } from '@/lib/audio';
import { useBbMode } from '@/lib/bbmode';
import {
  deleteUserCard,
  revokeCardItem,
  toCardItem,
  type UserCardRecord,
} from '@/lib/userCards';

const SWIPE_THRESHOLD = 60;

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
  const bbMode = useBbMode();
  const touchStartX = useRef<number | null>(null);

  const items = useMemo(() => records.map(toCardItem), [records]);
  useEffect(() => {
    return () => items.forEach(revokeCardItem);
  }, [items]);

  const total = items.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const card = total > 0 ? items[safeIndex] : null;

  const go = useCallback(
    (delta: number) => {
      if (total > 0) setIndex((i) => (i + delta + total) % total);
    },
    [total]
  );

  useEffect(() => {
    if (!card) return;
    onCardViewed();
    const t = window.setTimeout(() => {
      playCard(card, 'both');
    }, 300);
    return () => {
      window.clearTimeout(t);
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, total]);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
  };

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = () => {
    setEditing(records[safeIndex] ?? null);
    setEditorOpen(true);
  };

  const handleDelete = async () => {
    const rec = records[safeIndex];
    if (!rec) return;
    await deleteUserCard(rec.id);
    setConfirmDelete(false);
    setIndex((i) => Math.max(0, Math.min(i, records.length - 2)));
    onChanged();
  };

  return (
    <div
      className="flex min-h-dvh touch-pan-y flex-col bg-gradient-to-b from-rose-50 via-pink-50 to-amber-100 pb-16 select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
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
          <p className="text-base font-black text-slate-700">我的卡</p>
          <p className="text-xs font-semibold text-slate-400">My Cards</p>
        </div>
        <span className="flex h-11 min-w-11 items-center justify-center rounded-full bg-white/90 px-3 text-sm font-bold text-slate-500 shadow-sm">
          {total > 0 ? `${safeIndex + 1}/${total}` : '0'}
        </span>
      </header>

      {card ? (
        <>
          <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6">
            <FlashCard card={card} onTap={() => playCard(card, 'both')} />

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
                {/* 管理掣 */}
                <div className="flex gap-3">
                  <button
                    onClick={openEdit}
                    className="flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm active:scale-95"
                  >
                    <Pencil className="h-4 w-4" />
                    編輯
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-rose-500 shadow-sm active:scale-95"
                  >
                    <Trash2 className="h-4 w-4" />
                    刪除
                  </button>
                  <button
                    onClick={openNew}
                    className="flex items-center gap-1.5 rounded-full bg-orange-400 px-4 py-2 text-sm font-bold text-white shadow-sm active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    新增
                  </button>
                </div>
              </>
            )}
          </main>

          {!bbMode && (
            <footer className="flex items-center justify-center gap-10 pb-4">
              <button
                onClick={() => go(-1)}
                aria-label="上一張"
                className="flex h-16 w-16 items-center justify-center rounded-full border-b-4 border-slate-300 bg-white text-slate-600 shadow-md active:scale-90"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <span className="text-sm font-bold text-slate-400">
                {safeIndex + 1} / {total}
              </span>
              <button
                onClick={() => go(1)}
                aria-label="下一張"
                className="flex h-16 w-16 items-center justify-center rounded-full border-b-4 border-orange-300 bg-orange-400 text-white shadow-md active:scale-90"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </footer>
          )}
        </>
      ) : (
        /* 未有任何自製卡 */
        <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
          <p className="text-lg font-black text-slate-600">未有自己的卡</p>
          <p className="max-w-xs text-sm text-slate-400">
            例如 upload 爸爸張相，輸入中英文，再錄返把聲，
            整一套你屋企專用嘅學習卡！
          </p>
          {!bbMode && (
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

      {/* 編輯器 */}
      <CardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={editing}
        onSaved={onChanged}
      />

      {/* 刪除確認 */}
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
              className="h-11 flex-1 rounded-xl"
            >
              取消
            </Button>
            <Button
              onClick={handleDelete}
              className="h-11 flex-1 rounded-xl bg-rose-500 font-bold text-white hover:bg-rose-400"
            >
              刪除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
