/**
 * 自製卡編輯器
 * 揀相（自動縮做 512px WebP）＋ 輸入中英文 ＋ 每個語言可以 upload mp3 或即場錄音。
 * 新增同編輯都用佢（有 initial 就係編輯）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Mic, Square, Upload, Volume2, X } from 'lucide-react';
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
import {
  downscaleImage,
  newUserCardId,
  saveUserCard,
  type UserCardRecord,
} from '@/lib/userCards';

interface CardEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 編輯現有卡就傳入；新增就 null */
  initial: UserCardRecord | null;
  onSaved: () => void;
}

/** 一個語言嘅聲音選擇器：upload 檔案 / 錄音 / 試聽 / 清除 */
function AudioPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Blob | null;
  onChange: (b: Blob | null) => void;
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
    } else {
      try {
        await start();
      } catch {
        toast.error('開唔到咪高峰，請檢查權限');
      }
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
            recording
              ? 'animate-pulse bg-rose-500 text-white'
              : 'bg-rose-100 text-rose-600'
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
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function CardEditor({ open, onOpenChange, initial, onSaved }: CardEditorProps) {
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [en, setEn] = useState('');
  const [cn, setCn] = useState('');
  const [audioEn, setAudioEn] = useState<Blob | null>(null);
  const [audioCn, setAudioCn] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const imagePreview = useMemo(
    () => (imageBlob ? URL.createObjectURL(imageBlob) : null),
    [imageBlob]
  );
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  // 打開時載入現有卡（編輯）或清空（新增）
  useEffect(() => {
    if (!open) return;
    setImageBlob(initial?.image ?? null);
    setEn(initial?.en ?? '');
    setCn(initial?.cn ?? '');
    setAudioEn(initial?.audioEn ?? null);
    setAudioCn(initial?.audioCn ?? null);
  }, [open, initial]);

  const handlePickImage = async (f: File) => {
    try {
      setImageBlob(await downscaleImage(f));
    } catch {
      toast.error('呢張圖處理唔到，試過第二張');
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
      toast.success(initial ? '已更新！' : '加咗新卡！');
      onSaved();
    } catch {
      toast.error('儲存失敗，請再試');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {initial ? '編輯卡片' : '整張新卡'}
          </DialogTitle>
        </DialogHeader>

        {/* 揀相 */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 active:scale-[0.98]"
        >
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="卡片圖"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="flex flex-col items-center gap-2 text-slate-400">
              <ImagePlus className="h-10 w-10" />
              <span className="text-sm font-semibold">
                揀張相（例如爸爸張相）
              </span>
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handlePickImage(f);
            e.target.value = '';
          }}
        />

        {/* 文字 */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-600">英文</span>
            <Input
              value={en}
              onChange={(e) => setEn(e.target.value)}
              placeholder="Daddy"
              className="h-12 rounded-xl text-lg font-bold"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-600">中文</span>
            <Input
              value={cn}
              onChange={(e) => setCn(e.target.value)}
              placeholder="爸爸"
              className="h-12 rounded-xl text-lg font-bold"
            />
          </label>
        </div>

        {/* 聲音 */}
        <AudioPicker label="英文發音" value={audioEn} onChange={setAudioEn} />
        <AudioPicker label="中文發音（可以錄廣東話）" value={audioCn} onChange={setAudioCn} />

        <p className="text-center text-xs text-slate-400">
          自製卡淨係存喺呢部機；刪咗 app 或者清咗 app data 就會冇咗。
        </p>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 w-full rounded-2xl bg-orange-400 text-base font-bold text-white hover:bg-orange-300"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : '儲存'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
