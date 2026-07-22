import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Candy, Check, House, RotateCcw, Volume2, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cardKey, loadBookmarks } from '@/lib/bookmarks';
import { playCard, stopAudio } from '@/lib/audio';
import { assetUrl } from '@/lib/assets';
import { playRandomGameResponse } from '@/lib/gameResponses';
import { playMathCorrect, playMathQuestion, playMathWrong, type MathAudioProblem } from '@/lib/mathAudio';
import type { CardItem, Topic } from '@/types/card';

export type MiniGameKind =
  | 'listen-pick'
  | 'picture-pick'
  | 'letter-game'
  | 'color-game'
  | 'number-math';

interface MiniGameScreenProps {
  kind: MiniGameKind;
  topics: Topic[];
  onBack: () => void;
}

interface GameCard extends CardItem {
  topicId: string;
  topicName: string;
}

const CANDY_KEY = 'babycards_candies';

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function getCandies() {
  try {
    return parseInt(localStorage.getItem(CANDY_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveCandies(value: number) {
  try {
    localStorage.setItem(CANDY_KEY, String(value));
  } catch {
    /* ignore */
  }
}

function buildCards(topics: Topic[]): GameCard[] {
  return topics.flatMap((topic) =>
    topic.cards.map((card) => ({
      ...card,
      topicId: topic.id,
      topicName: topic.cn || topic.en,
    }))
  );
}

function choiceCount(kind: MiniGameKind) {
  if (kind === 'picture-pick') return 2;
  if (kind === 'number-math') return 4;
  return 4;
}

function gameTitleFor(kind: MiniGameKind) {
  if (kind === 'listen-pick') return '聽聲揀圖';
  if (kind === 'picture-pick') return '睇圖揀字';
  if (kind === 'letter-game') return '字母遊戲';
  if (kind === 'color-game') return '顏色遊戲';
  return '加減遊戲';
}

function makeMathProblem() {
  const plus = Math.random() < 0.55;
  const left = plus ? Math.floor(Math.random() * 10) + 1 : Math.floor(Math.random() * 9) + 2;
  const right = plus
    ? Math.floor(Math.random() * 10) + 1
    : Math.floor(Math.random() * (left - 1)) + 1;
  const answer = plus ? left + right : left - right;
  const options = new Set<number>([answer]);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 9) - 4;
    const candidate = Math.max(1, Math.min(20, answer + offset));
    options.add(candidate);
  }
  return {
    text: `${left} ${plus ? '+' : '-'} ${right}`,
    left,
    right,
    op: plus ? 'add' : 'minus',
    answer,
    options: shuffle([...options]),
  } satisfies MathAudioProblem & { text: string; options: number[] };
}

export function MiniGameScreen({ kind, topics, onBack }: MiniGameScreenProps) {
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [target, setTarget] = useState<GameCard | null>(null);
  const [choices, setChoices] = useState<GameCard[]>([]);
  const [wrongIds, setWrongIds] = useState<Set<string>>(() => new Set());
  const [correctId, setCorrectId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [mathProblem, setMathProblem] = useState(() => makeMathProblem());
  const [wrongMath, setWrongMath] = useState<Set<number>>(() => new Set());
  const [candies, setCandies] = useState(() => getCandies());
  const [candyFly, setCandyFly] = useState(0);
  const [round, setRound] = useState(0);
  const aliveRef = useRef(true);
  const interactionRef = useRef(0);

  const allCards = useMemo(() => buildCards(topics), [topics]);
  const pool = useMemo(() => {
    const bookmarks = loadBookmarks();
    return allCards.filter((card) => {
      const fixedTopic =
        kind === 'letter-game'
          ? 'letters'
          : kind === 'color-game'
            ? 'colors'
            : null;
      const topicOk = fixedTopic
        ? card.topicId === fixedTopic
        : selectedTopic === 'all' || card.topicId === selectedTopic;
      const bookmarkOk = !bookmarksOnly || bookmarks.has(cardKey(card.topicId, card.id));
      return topicOk && bookmarkOk;
    });
  }, [allCards, bookmarksOnly, kind, selectedTopic, round]);

  const needed = choiceCount(kind);
  const canPlay = kind === 'number-math' || pool.length >= needed;
  const gameTitle = gameTitleFor(kind);

  const makeRound = () => {
    if (kind === 'number-math') {
      setMathProblem(makeMathProblem());
      setWrongMath(new Set());
      setCorrectId(null);
      setResolving(false);
      setRound((value) => value + 1);
      return;
    }
    if (!canPlay) {
      setTarget(null);
      setChoices([]);
      return;
    }
    const picked = shuffle(pool).slice(0, needed);
    const answer = picked[Math.floor(Math.random() * picked.length)];
    setTarget(answer);
    setChoices(shuffle(picked));
    setWrongIds(new Set());
    setCorrectId(null);
    setResolving(false);
    setRound((value) => value + 1);
  };

  const interruptAudio = () => {
    interactionRef.current += 1;
    stopAudio();
  };

  useEffect(() => {
    makeRound();
    return () => {
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, selectedTopic, bookmarksOnly, canPlay]);

  useEffect(() => {
    if (!target || correctId) return;
    const timer = window.setTimeout(() => {
      void playCard(target, kind === 'letter-game' ? 'en' : 'both');
    }, 350);
    return () => window.clearTimeout(timer);
  }, [kind, target, correctId, round]);

  useEffect(() => {
    if (kind !== 'number-math' || correctId) return;
    const timer = window.setTimeout(() => {
      void playMathQuestion(mathProblem);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [kind, mathProblem, correctId, round]);

  const replay = () => {
    interruptAudio();
    if (target) void playCard(target, kind === 'letter-game' ? 'en' : 'both');
  };

  const replayMath = () => {
    interruptAudio();
    void playMathQuestion(mathProblem);
  };

  const nextRound = () => {
    interruptAudio();
    makeRound();
  };

  const answerMath = (value: number) => {
    if (resolving || correctId || wrongMath.has(value)) return;
    const interaction = ++interactionRef.current;
    stopAudio();
    const active = () => aliveRef.current && interaction === interactionRef.current;
    setResolving(true);
    if (value === mathProblem.answer) {
      setCorrectId('math');
      const nextCandies = candies + 1;
      setCandies(nextCandies);
      saveCandies(nextCandies);
      setCandyFly((current) => current + 1);
      void (async () => {
        await playMathCorrect(mathProblem.answer);
        if (!active()) return;
        if (active()) makeRound();
      })();
    } else {
      setWrongMath((current) => new Set(current).add(value));
      void (async () => {
        await playMathWrong();
        if (!active()) return;
        await playMathQuestion(mathProblem);
        if (active()) setResolving(false);
      })();
    }
  };

  const answer = (card: GameCard) => {
    if (!target || resolving || correctId || wrongIds.has(card.id)) return;
    const interaction = ++interactionRef.current;
    stopAudio();
    const active = () => aliveRef.current && interaction === interactionRef.current;
    setResolving(true);
    if (card.id === target.id) {
      setCorrectId(card.id);
      const nextCandies = candies + 1;
      setCandies(nextCandies);
      saveCandies(nextCandies);
      setCandyFly((value) => value + 1);
      void (async () => {
        await playRandomGameResponse('correct');
        if (!active()) return;
        await playCard(target, kind === 'letter-game' ? 'en' : 'both');
        if (active()) makeRound();
      })();
    } else {
      setWrongIds((current) => new Set(current).add(card.id));
      void (async () => {
        await playRandomGameResponse('wrong');
        if (!active()) return;
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        if (!active()) return;
        await playCard(target, kind === 'letter-game' ? 'en' : 'both');
        if (active()) setResolving(false);
      })();
    }
  };

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  return (
    <div
      className="flex min-h-dvh flex-col bg-gradient-to-b from-amber-50 via-orange-50 to-rose-100 pb-16 select-none"
      onKeyDownCapture={interruptAudio}
    >
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(env(safe-area-inset-top),1.5rem)]">
        <button
          onClick={() => {
            interruptAudio();
            onBack();
          }}
          aria-label="返回"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm active:scale-90"
        >
          <House className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-base font-black text-slate-700">{gameTitle}</p>
          <p className="text-xs font-semibold text-slate-400">Mini Games</p>
        </div>
        <div className="relative flex h-11 min-w-20 items-center justify-center gap-1 rounded-full bg-white/90 px-3 text-sm font-black text-orange-500 shadow-sm">
          <Candy className="h-5 w-5" />
          {candies}
          {candyFly > 0 && (
            <span
              key={candyFly}
              className="pointer-events-none fixed left-1/2 top-1/2 z-50 text-5xl animate-[candyFly_1.05s_ease-in-out_forwards]"
            >
              🍬
            </span>
          )}
        </div>
      </header>

      <section className="mx-auto mt-3 grid w-full max-w-md grid-cols-[1fr_auto] gap-3 px-4">
        {kind === 'listen-pick' || kind === 'picture-pick' ? (
          <>
            <select
              value={selectedTopic}
              onChange={(event) => {
                interruptAudio();
                setSelectedTopic(event.target.value);
              }}
              className="h-11 rounded-2xl border border-white bg-white/90 px-3 text-sm font-bold text-slate-600 shadow-sm outline-none"
            >
              <option value="all">All Topics</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.cn || topic.en}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-2xl bg-white/90 px-3 py-2 shadow-sm">
              <span className="text-xs font-semibold text-slate-600">書簽</span>
              <Switch
                checked={bookmarksOnly}
                onCheckedChange={(value) => {
                  interruptAudio();
                  setBookmarksOnly(value);
                }}
              />
            </label>
          </>
        ) : (
          <span />
        )}
      </section>

      {kind === 'number-math' ? (
        <main className="flex flex-1 flex-col justify-center gap-6 px-5 py-4">
          <div className="rounded-[2rem] bg-white/90 p-8 text-center shadow-lg">
            <p className="text-6xl font-black text-slate-800">{mathProblem.text}</p>
            <p className="mt-3 text-5xl font-black text-orange-500">= ?</p>
            <button
              onClick={replayMath}
              disabled={resolving}
              aria-label="再聽"
              className="mx-auto mt-5 flex h-12 items-center gap-2 rounded-full bg-sky-100 px-5 font-black text-sky-700 active:scale-95"
            >
              <Volume2 className="h-5 w-5" />
              再聽
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {mathProblem.options.map((value) => {
              const wrong = wrongMath.has(value);
              const correct = correctId === 'math' && value === mathProblem.answer;
              return (
                <button
                  key={value}
                  onClick={() => answerMath(value)}
                  disabled={resolving || wrong || Boolean(correctId)}
                  className={`min-h-28 rounded-3xl border-b-4 bg-white text-5xl font-black shadow-md transition ${
                    correct ? 'scale-105 border-emerald-300 ring-4 ring-emerald-300' : 'border-orange-200 active:scale-95'
                  } ${wrong ? 'grayscale brightness-50' : ''}`}
                >
                  {value}
                </button>
              );
            })}
          </div>
          <button
            onClick={nextRound}
            aria-label="下一題"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm active:scale-95"
          >
            <ArrowRight className="h-7 w-7" />
          </button>
        </main>
      ) : !canPlay || !target ? (
        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="rounded-3xl bg-white/85 px-6 py-8 shadow-sm">
            <p className="text-lg font-black text-slate-700">卡片唔夠</p>
            <p className="mt-2 text-sm font-semibold text-slate-400">
              {kind === 'listen-pick' ? '呢個遊戲最少要 4 張卡。' : '呢個遊戲最少要 2 張卡。'}
            </p>
          </div>
        </main>
      ) : kind === 'listen-pick' || kind === 'letter-game' || kind === 'color-game' ? (
        <>
          <main className="flex flex-1 flex-col justify-center gap-5 px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              {choices.map((choice) => {
                const wrong = wrongIds.has(choice.id);
                const correct = correctId === choice.id;
                return (
                  <button
                    key={choice.id}
                    onClick={() => answer(choice)}
                    disabled={resolving || wrong || Boolean(correctId)}
                    className={`aspect-square overflow-hidden rounded-3xl border-b-4 bg-white p-2 shadow-md transition ${
                      correct
                        ? 'scale-110 border-emerald-300 ring-4 ring-emerald-300'
                        : 'border-orange-200 active:scale-95'
                    } ${wrong ? 'grayscale brightness-50' : ''}`}
                  >
                    <img
                      src={assetUrl(choice.image)}
                      alt=""
                      className="h-full w-full rounded-2xl object-contain"
                      draggable={false}
                    />
                  </button>
                );
              })}
            </div>
            <div className="rounded-3xl bg-white/90 p-5 text-center shadow-sm">
              {kind !== 'letter-game' && (
                <>
                  <p className="text-4xl font-black text-slate-800">{target.en}</p>
                  <p className="mt-1 text-3xl font-black text-orange-500">{target.cn}</p>
                </>
              )}
              <button
                onClick={replay}
                disabled={resolving}
                className="mx-auto flex h-12 items-center gap-2 rounded-full bg-sky-100 px-5 font-black text-sky-700 active:scale-95"
              >
                <Volume2 className="h-5 w-5" />
                再聽
              </button>
            </div>
          </main>
        </>
      ) : (
        <main className="flex flex-1 flex-col justify-center gap-5 px-5 py-4">
          <button
            onClick={replay}
            disabled={resolving}
            className={`mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-[2rem] border-b-8 border-orange-200 bg-white p-3 shadow-lg ${
              correctId ? 'scale-105 ring-4 ring-emerald-300' : ''
            }`}
          >
            <img
              src={assetUrl(target.image)}
              alt={target.en}
              className="h-full w-full rounded-[1.35rem] object-contain"
              draggable={false}
            />
          </button>

          <div className="grid grid-cols-2 gap-3">
            {choices.map((choice) => {
              const wrong = wrongIds.has(choice.id);
              const correct = correctId === choice.id;
              return (
                <button
                  key={choice.id}
                  onClick={() => answer(choice)}
                  disabled={resolving || wrong || Boolean(correctId)}
                  className={`min-h-32 rounded-3xl border-b-4 bg-white px-3 py-4 text-center shadow-md transition ${
                    correct
                      ? 'scale-105 border-emerald-300 ring-4 ring-emerald-300'
                      : 'border-orange-200 active:scale-95'
                  } ${wrong ? 'grayscale brightness-50' : ''}`}
                >
                  <p className="text-2xl font-black text-slate-800">{choice.en}</p>
                  <p className="mt-1 text-xl font-black text-orange-500">{choice.cn}</p>
                  <span className="mt-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    {correct ? <Check className="h-5 w-5" /> : wrong ? <X className="h-5 w-5" /> : null}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={nextRound}
            className="mx-auto flex h-11 items-center gap-2 rounded-full bg-white/90 px-4 text-sm font-bold text-slate-500 shadow-sm active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            下一題
          </button>
        </main>
      )}

      {correctId && target && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-amber-50 px-6 pb-20 pt-10">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto aspect-square w-full overflow-hidden rounded-[2rem] bg-white p-4 shadow-2xl ring-8 ring-emerald-300">
              <img
                src={assetUrl(target.image)}
                alt={target.en}
                className="h-full w-full rounded-[1.35rem] object-contain"
                draggable={false}
              />
            </div>
            {kind !== 'letter-game' && (
              <>
                <p className="mt-6 text-5xl font-black text-slate-800">{target.en}</p>
                <p className="mt-2 text-4xl font-black text-orange-500">{target.cn}</p>
              </>
            )}
            <button
              onClick={nextRound}
              aria-label="下一題"
              className="mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full border-b-4 border-orange-300 bg-orange-400 text-white shadow-lg active:scale-95"
            >
              <ArrowRight className="h-8 w-8" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
