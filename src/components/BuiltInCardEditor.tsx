import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Check, ImagePlus, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { AudioPicker, cropImageToSquare } from '@/components/CardEditor';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getCardOverride,
  overrideId,
  resetCardOverride,
  saveCardOverride,
  type CardOverrideRecord,
} from '@/lib/cardOverrides';
import { assetUrl } from '@/lib/assets';
import type { CardItem } from '@/types/card';

interface BuiltInCardEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topicId: string;
  card: CardItem | null;
  onSaved: () => void;
}

export function BuiltInCardEditor({
  open,
  onOpenChange,
  topicId,
  card,
  onSaved,
}: BuiltInCardEditorProps) {
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [audioEn, setAudioEn] = useState<Blob | null>(null);
  const [audioCn, setAudioCn] = useState<Blob | null>(null);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; ox: number; oy: number } | null>(null);

  const imagePreview = useMemo(
    () => (imageBlob ? URL.createObjectURL(imageBlob) : null),
    [imageBlob]
  );

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    return () => {
      if (cropUrl) URL.revokeObjectURL(cropUrl);
    };
  }, [cropUrl]);

  useEffect(() => {
    if (!open || !card) return;
    let alive = true;
    setSaving(true);
    getCardOverride(topicId, card.id)
      .then((rec) => {
        if (!alive) return;
        setImageBlob(rec?.image ?? null);
        setAudioEn(rec?.audioEn ?? null);
        setAudioCn(rec?.audioCn ?? null);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setCropUrl(null);
      })
      .catch(() => toast.error('讀取自定義資料失敗'))
      .finally(() => {
        if (alive) setSaving(false);
      });
    return () => {
      alive = false;
    };
  }, [open, topicId, card]);

  if (!card) return null;

  const currentImage = imagePreview ?? assetUrl(card.image);
  const hasImage = Boolean(imageBlob || card.hasImageOverride);
  const hasEn = Boolean(audioEn || card.hasAudioEnOverride);
  const hasCn = Boolean(audioCn || card.hasAudioCnOverride);

  const makeRecord = (): CardOverrideRecord => ({
    id: overrideId(topicId, card.id),
    topicId,
    cardId: card.id,
    image: imageBlob,
    audioEn,
    audioCn,
    updatedAt: Date.now(),
  });

  const save = async () => {
    setSaving(true);
    try {
      await saveCardOverride(makeRecord());
      toast.success('已更新卡片');
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error('儲存失敗，請再試');
    } finally {
      setSaving(false);
    }
  };

  const reset = async (field?: 'image' | 'audioEn' | 'audioCn') => {
    setSaving(true);
    try {
      await resetCardOverride(topicId, card.id, field);
      if (!field || field === 'image') setImageBlob(null);
      if (!field || field === 'audioEn') setAudioEn(null);
      if (!field || field === 'audioCn') setAudioCn(null);
      toast.success(field ? '已還原' : '已全部還原 default');
      onSaved();
      if (!field) onOpenChange(false);
    } catch {
      toast.error('還原失敗，請再試');
    } finally {
      setSaving(false);
    }
  };

  const handlePickImage = (file: File) => {
    if (cropUrl) URL.revokeObjectURL(cropUrl);
    setCropUrl(URL.createObjectURL(file));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({
      x: drag.ox + (event.clientX - drag.x) * 2,
      y: drag.oy + (event.clientY - drag.y) * 2,
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const applyCrop = async () => {
    if (!cropUrl) return;
    try {
      setImageBlob(await cropImageToSquare(cropUrl, zoom, offset));
      URL.revokeObjectURL(cropUrl);
      setCropUrl(null);
    } catch {
      toast.error('圖片裁剪失敗，請試另一張');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-sm overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">編輯內置卡</DialogTitle>
        </DialogHeader>

        {cropUrl ? (
          <div className="space-y-3">
            <div
              className="relative mx-auto aspect-square w-full max-w-[280px] touch-none overflow-hidden rounded-2xl bg-white shadow-inner"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <img
                src={cropUrl}
                alt="裁剪圖片"
                className="h-full w-full select-none object-contain"
                draggable={false}
                style={{
                  transform: `translate(${offset.x / 2}px, ${offset.y / 2}px) scale(${zoom})`,
                }}
              />
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-orange-300 ring-inset" />
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-slate-600">放大縮細</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-orange-400"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setCropUrl(null)} className="h-11 rounded-xl">
                取消
              </Button>
              <Button onClick={applyCrop} className="h-11 rounded-xl bg-orange-400 font-bold text-white hover:bg-orange-300">
                <Check className="h-4 w-4" />
                使用
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 active:scale-[0.98]"
              >
                <img src={currentImage} alt={card.en} className="h-full w-full rounded-2xl object-contain" />
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-600 active:scale-95"
                aria-label="更換圖片"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handlePickImage(file);
                event.target.value = '';
              }}
            />

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
              <p className="text-2xl font-black text-slate-800">{card.en}</p>
              <p className="mt-1 text-xl font-black text-orange-500">{card.cn}</p>
            </div>

            <AudioPicker label="英文發音" value={audioEn} onChange={setAudioEn} />
            <AudioPicker label="中文發音" value={audioCn} onChange={setAudioCn} />

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" disabled={!hasImage || saving} onClick={() => reset('image')} className="h-10 rounded-xl text-xs">
                圖片
              </Button>
              <Button variant="outline" disabled={!hasEn || saving} onClick={() => reset('audioEn')} className="h-10 rounded-xl text-xs">
                英文音
              </Button>
              <Button variant="outline" disabled={!hasCn || saving} onClick={() => reset('audioCn')} className="h-10 rounded-xl text-xs">
                中文音
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" disabled={saving || (!hasImage && !hasEn && !hasCn)} onClick={() => reset()} className="h-12 rounded-2xl">
                <RotateCcw className="h-4 w-4" />
                全部還原
              </Button>
              <Button onClick={save} disabled={saving} className="h-12 rounded-2xl bg-orange-400 text-base font-bold text-white hover:bg-orange-300">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : '儲存'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
