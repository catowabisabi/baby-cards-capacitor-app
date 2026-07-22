import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Play, Square, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useRecorder } from '@/hooks/useRecorder';
import {
  deleteCustomGameSound,
  getCustomGameSounds,
  saveCustomGameSound,
  setGameSoundMode,
  useGameSoundModes,
  type CustomGameSound,
  type GameSoundCategory,
  type GameSoundMode,
} from '@/lib/gameSoundSettings';

const GROUPS: { category: GameSoundCategory; title: string; hint: string }[] = [
  { category: 'question-en', title: '問題英文', hint: 'Question English' },
  { category: 'question-cn', title: '問題中文', hint: 'Question 中文' },
  { category: 'correct-en', title: '答啱英文', hint: 'Correct English' },
  { category: 'correct-cn', title: '答啱中文', hint: 'Correct 中文' },
  { category: 'wrong-en', title: '答錯英文', hint: 'Wrong English' },
  { category: 'wrong-cn', title: '答錯中文', hint: 'Wrong 中文' },
];

const MODE_LABELS: Record<GameSoundMode, string> = {
  default: 'Default',
  custom: '自定義',
  off: '關閉',
};

function SoundGroup({
  category,
  title,
  hint,
  mode,
}: {
  category: GameSoundCategory;
  title: string;
  hint: string;
  mode: GameSoundMode;
}) {
  const { recording, start, stop } = useRecorder();
  const [sounds, setSounds] = useState<CustomGameSound[]>([]);
  const [busy, setBusy] = useState(false);
  const latestUrl = useMemo(
    () => (sounds[0] ? URL.createObjectURL(sounds[0].blob) : null),
    [sounds]
  );
  const mounted = useRef(true);

  const refresh = async () => {
    const next = await getCustomGameSounds(category);
    if (mounted.current) setSounds(next);
  };

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    return () => {
      if (latestUrl) URL.revokeObjectURL(latestUrl);
    };
  }, [latestUrl]);

  const record = async () => {
    if (recording) {
      const blob = await stop();
      if (blob.size > 0) {
        setBusy(true);
        try {
          await saveCustomGameSound(category, blob);
          setGameSoundMode(category, 'custom');
          await refresh();
          toast.success('已儲存錄音');
        } catch {
          toast.error('錄音儲存失敗');
        } finally {
          setBusy(false);
        }
      }
      return;
    }

    try {
      await start();
    } catch {
      toast.error('開唔到咪高峰，請檢查錄音權限');
    }
  };

  const playLatest = () => {
    if (latestUrl) new Audio(latestUrl).play().catch(() => {});
  };

  const deleteLatest = async () => {
    const latest = sounds[0];
    if (!latest) return;
    setBusy(true);
    try {
      await deleteCustomGameSound(latest.id);
      await refresh();
      toast.success('已刪除最新一段錄音');
    } catch {
      toast.error('刪除失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-700">{title}</p>
          <p className="text-xs font-semibold text-slate-400">{hint}</p>
        </div>
        <select
          value={mode}
          onChange={(event) => setGameSoundMode(category, event.target.value as GameSoundMode)}
          className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600"
        >
          {(['default', 'custom', 'off'] as GameSoundMode[]).map((value) => (
            <option key={value} value={value}>
              {MODE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={record}
          disabled={busy}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold active:scale-95 ${
            recording ? 'animate-pulse bg-rose-500 text-white' : 'bg-rose-100 text-rose-600'
          }`}
        >
          {recording ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {recording ? '停止' : '錄一段'}
        </button>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
          {sounds.length} 段
        </span>
        {latestUrl && (
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={playLatest}
              className="h-8 rounded-full px-2.5 text-xs"
            >
              <Play className="h-3.5 w-3.5" />
              試聽最新
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={deleteLatest}
              disabled={busy}
              className="h-8 rounded-full px-2.5 text-xs text-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              刪最新
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function GameSoundSettings() {
  const modes = useGameSoundModes();

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-black text-slate-700">遊戲聲音</h3>
        <p className="text-xs font-semibold text-slate-400">
          每類可以用內置聲、自定義錄音，或者關閉。
        </p>
      </div>
      {GROUPS.map((group) => (
        <SoundGroup
          key={group.category}
          {...group}
          mode={modes[group.category] ?? 'default'}
        />
      ))}
    </section>
  );
}
