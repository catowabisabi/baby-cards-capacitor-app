import {
  beginAudioSequence,
  isAudioSequenceActive,
  playAudioFilesGapless,
  playAudioFile,
  speakInCurrentSequence,
} from './audio';
import {
  getGameSoundMode,
  pickCustomGameSound,
  type GameSoundCategory,
} from './gameSoundSettings';

export interface MathAudioProblem {
  left: number;
  right: number;
  op: 'add' | 'minus';
  answer: number;
}

const MATH_AUDIO = 'math_sound';

const cnNumbers: Record<number, string> = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
  5: '五',
  6: '六',
  7: '七',
  8: '八',
  9: '九',
  10: '十',
  11: '十一',
  12: '十二',
  13: '十三',
  14: '十四',
  15: '十五',
  16: '十六',
  17: '十七',
  18: '十八',
  19: '十九',
  20: '二十',
};

function numberAudio(value: number, lang: 'en' | 'cn') {
  const ext = lang === 'en' ? 'wav' : 'mp3';
  return `data/numbers/${value}-${lang}.${ext}`;
}

function mathAudio(id: string, lang: 'en' | 'cn') {
  const ext = lang === 'en' ? 'wav' : 'mp3';
  return `${MATH_AUDIO}/${id}-${lang}.${ext}`;
}

async function playOrSpeak(path: string, fallback: string, lang: 'en-US' | 'zh-HK') {
  const played = await playAudioFile(path);
  if (!played) await speakInCurrentSequence(fallback, lang);
}

async function playCustom(category: GameSoundCategory): Promise<boolean> {
  const blob = await pickCustomGameSound(category);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  try {
    await playAudioFile(url);
  } finally {
    URL.revokeObjectURL(url);
  }
  return true;
}

async function playSequence(
  token: number,
  items: Array<{ audio: string; text: string; lang: 'en-US' | 'zh-HK' }>
) {
  for (const item of items) {
    if (!isAudioSequenceActive(token)) return;
    await playOrSpeak(item.audio, item.text, item.lang);
  }
}

async function playCategory(
  token: number,
  category: GameSoundCategory,
  items: Array<{ audio: string; text: string; lang: 'en-US' | 'zh-HK' }>
) {
  const mode = getGameSoundMode(category);
  if (mode === 'off') return;
  if (mode === 'custom' && (await playCustom(category))) return;
  if (!isAudioSequenceActive(token)) return;
  const playedGapless = await playAudioFilesGapless(items.map((item) => item.audio));
  if (playedGapless) return;
  if (!isAudioSequenceActive(token)) return;
  await playSequence(token, items);
}

export async function playMathQuestion(problem: MathAudioProblem) {
  const token = beginAudioSequence();
  const opCn = problem.op === 'add' ? '加' : '減';

  await playCategory(token, 'question-en', [
    { audio: numberAudio(problem.left, 'en'), text: String(problem.left), lang: 'en-US' },
    {
      audio: mathAudio(problem.op, 'en'),
      text: problem.op === 'add' ? 'add' : 'minus',
      lang: 'en-US',
    },
    { audio: numberAudio(problem.right, 'en'), text: String(problem.right), lang: 'en-US' },
    { audio: mathAudio('is-equal-to', 'en'), text: 'is equal to', lang: 'en-US' },
  ]);

  if (!isAudioSequenceActive(token)) return;

  await playCategory(token, 'question-cn', [
    {
      audio: numberAudio(problem.left, 'cn'),
      text: cnNumbers[problem.left] ?? String(problem.left),
      lang: 'zh-HK',
    },
    { audio: mathAudio(problem.op, 'cn'), text: opCn, lang: 'zh-HK' },
    {
      audio: numberAudio(problem.right, 'cn'),
      text: cnNumbers[problem.right] ?? String(problem.right),
      lang: 'zh-HK',
    },
    { audio: mathAudio('equal', 'cn'), text: '等於', lang: 'zh-HK' },
  ]);
}

export async function playMathWrong() {
  const token = beginAudioSequence();
  const firstChinese = Math.random() < 0.5;
  const en = [
    { audio: mathAudio('wrong', 'en'), text: 'Not correct, try again', lang: 'en-US' as const },
  ];
  const cn = [
    { audio: mathAudio('wrong', 'cn'), text: '唔啱，再試一次', lang: 'zh-HK' as const },
  ];

  if (firstChinese) {
    await playCategory(token, 'wrong-cn', cn);
    if (isAudioSequenceActive(token)) await playCategory(token, 'wrong-en', en);
  } else {
    await playCategory(token, 'wrong-en', en);
    if (isAudioSequenceActive(token)) await playCategory(token, 'wrong-cn', cn);
  }
}

export async function playMathCorrect(answer: number) {
  const token = beginAudioSequence();
  await playCategory(token, 'correct-en', [
    { audio: mathAudio('correct-prefix', 'en'), text: 'Yes! The answer is', lang: 'en-US' },
    { audio: numberAudio(answer, 'en'), text: String(answer), lang: 'en-US' },
  ]);

  if (!isAudioSequenceActive(token)) return;

  await playCategory(token, 'correct-cn', [
    { audio: mathAudio('correct-prefix', 'cn'), text: '係啦，答案係', lang: 'zh-HK' },
    {
      audio: numberAudio(answer, 'cn'),
      text: cnNumbers[answer] ?? String(answer),
      lang: 'zh-HK',
    },
  ]);
}
