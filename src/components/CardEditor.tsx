import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Check, ImagePlus, Loader2, Mic, Square, Upload, Volume2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useRecorder } from '@/hooks/useRecorder';
import { newUserCardId, saveUserCard, type UserCardRecord } from '@/lib/userCards';

interface CardEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: UserCardRecord | null;
  onSaved: () => void;
}

export function AudioPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
}) {
  const { recording, start, stop } = useRecorder();
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleRecord = async () => {
    if (recording) {
      const blob = await stop();
      if (blob.size > 0) onChange(blob);
      return;
    }

    try {
      await start();
    } catch {
      toast.error('開唔到咪高峰，請檢查錄音權限');
    }
  };

  const play = () => {
    if (previewUrl) new Audio(previewUrl).play().catch(() => {});
  };

  return (
    <div className="rounded-2xl border border-slate-200 p-3">
      <p className="mb-2 text-sm font-bold text-slate-600">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRecord}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold active:scale-95 ${
            recording ? 'animate-pulse bg-rose-500 text-white' : 'bg-rose-100 text-rose-600'
          }`}
        >
          {recording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {recording ? '停止' : '錄音'}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-2 text-xs font-bold text-sky-600 active:scale-95"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
        {value && (
          <>
            <button
              type="button"
              onClick={play}
              className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-600 active:scale-95"
            >
              <Volume2 className="h-3.5 w-3.5" />
              試聽
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="清除聲音"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onChange(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}

export async function cropImageToSquare(
  imageUrl: string,
  zoom: number,
  offset: { x: number; y: number },
  outputSize = 512
): Promise<Blob> {
  const image = new Image();
  image.src = imageUrl;
  await image.decode();

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, outputSize, outputSize);

  const baseScale = Math.min(outputSize / image.naturalWidth, outputSize / image.naturalHeight);
  const scale = baseScale * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = outputSize / 2 - width / 2 + offset.x;
  const y = outputSize / 2 - height / 2 + offset.y;
  ctx.drawImage(image, x, y, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image crop failed'))),
      'image/webp',
      0.88
    );
  });
}

export function CardEditor({ open, onOpenChange, initial, onSaved }: CardEditorProps) {
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [en, setEn] = useState('');
  const [cn, setCn] = useState('');
  const [audioEn, setAudioEn] = useState<Blob | null>(null);
  const [audioCn, setAudioCn] = useState<Blob | null>(null);
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
    if (!open) return;
    setImageBlob(initial?.image ?? null);
    setEn(initial?.en ?? '');
    setCn(initial?.cn ?? '');
    setAudioEn(initial?.audioEn ?? null);
    setAudioCn(initial?.audioCn ?? null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setCropUrl(null);
  }, [open, initial]);

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

  const handleSave = async () => {
    if (!imageBlob) {
      toast.error('請先揀張圖');
      return;
    }
    if (!en.trim() || !cn.trim()) {
      toast.error('請輸入英文同中文');
      return;
    }
    setSaving(true);
    try {
      await saveUserCard({
        id: initial?.id ?? newUserCardId(),
        en: en.trim(),
        cn: cn.trim(),
        image: imageBlob,
        audioEn,
        audioCn,
        createdAt: initial?.createdAt ?? Date.now(),
      });
      onOpenChange(false);
      toast.success(initial ? '已更新' : '已新增卡片');
      onSaved();
    } catch {
      toast.error('儲存失敗，請再試');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-sm overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{initial ? '編輯卡片' : '新增卡片'}</DialogTitle>
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
              <Button
                variant="outline"
                onClick={() => {
                  URL.revokeObjectURL(cropUrl);
                  setCropUrl(null);
                }}
                className="h-11 rounded-xl"
              >
                取消
              </Button>
              <Button
                onClick={applyCrop}
                className="h-11 rounded-xl bg-orange-400 font-bold text-white hover:bg-orange-300"
              >
                <Check className="h-4 w-4" />
                使用
              </Button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 active:scale-[0.98]"
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="卡片圖"
                  className="h-full w-full rounded-2xl object-contain"
                />
              ) : (
                <span className="flex flex-col items-center gap-2 text-slate-400">
                  <ImagePlus className="h-10 w-10" />
                  <span className="text-sm font-semibold">揀張相</span>
                </span>
              )}
            </button>
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

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-600">英文</span>
                <Input
                  value={en}
                  onChange={(event) => setEn(event.target.value)}
                  placeholder="Daddy"
                  className="h-12 rounded-xl text-lg font-bold"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-600">中文</span>
                <Input
                  value={cn}
                  onChange={(event) => setCn(event.target.value)}
                  placeholder="爸爸"
                  className="h-12 rounded-xl text-lg font-bold"
                />
              </label>
            </div>

            <AudioPicker label="英文發音" value={audioEn} onChange={setAudioEn} />
            <AudioPicker label="中文發音" value={audioCn} onChange={setAudioCn} />

            <p className="text-center text-xs text-slate-400">
              自製卡只會存在呢部機。
            </p>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-12 w-full rounded-2xl bg-orange-400 text-base font-bold text-white hover:bg-orange-300"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : '儲存'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
