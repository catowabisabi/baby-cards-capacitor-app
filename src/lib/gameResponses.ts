import { assetUrl } from '@/lib/assets';
import {
  beginAudioSequence,
  isAudioSequenceActive,
  playAudioFile,
  speakText,
} from '@/lib/audio';
import {
  getGameSoundMode,
  pickCustomGameSound,
  type GameSoundCategory,
} from '@/lib/gameSoundSettings';

export type GameResponseKind = 'correct' | 'wrong';

interface GameResponse {
  id: string;
  en: string;
  cn: string;
  audioEn: string;
  audioCn: string;
}

const cache = new Map<GameResponseKind, GameResponse[]>();

function responseUrl(kind: GameResponseKind) {
  return kind === 'correct'
    ? 'correct_sound/responses.json'
    : 'wrong_sound/responses.json';
}

async function loadResponses(kind: GameResponseKind): Promise<GameResponse[]> {
  const cached = cache.get(kind);
  if (cached) return cached;

  try {
    const res = await fetch(assetUrl(responseUrl(kind)));
    const data = (await res.json()) as GameResponse[];
    cache.set(kind, data);
    return data;
  } catch {
    return [];
  }
}

function fallback(kind: GameResponseKind): GameResponse {
  return kind === 'correct'
    ? {
        id: 'correct-fallback',
        en: 'Great job! You got it right!',
        cn: '好叻呀，答啱啦！',
        audioEn: '',
        audioCn: '',
      }
    : {
        id: 'wrong-fallback',
        en: 'Not quite. Try again.',
        cn: '唔啱喎，再試下。',
        audioEn: '',
        audioCn: '',
      };
}

export async function playRandomGameResponse(kind: GameResponseKind) {
  const token = beginAudioSequence();
  const responses = await loadResponses(kind);
  if (!isAudioSequenceActive(token)) return;
  const picked =
    responses.length > 0
      ? responses[Math.floor(Math.random() * responses.length)]
      : fallback(kind);

  const firstChinese = Math.random() < 0.5;
  const sequence = firstChinese
    ? [
        { text: picked.cn, lang: 'zh-HK', audio: picked.audioCn },
        { text: picked.en, lang: 'en-US', audio: picked.audioEn },
      ]
    : [
        { text: picked.en, lang: 'en-US', audio: picked.audioEn },
        { text: picked.cn, lang: 'zh-HK', audio: picked.audioCn },
      ];

  for (const item of sequence) {
    if (!isAudioSequenceActive(token)) return;
    const category = `${kind}-${item.lang === 'en-US' ? 'en' : 'cn'}` as GameSoundCategory;
    const mode = getGameSoundMode(category);
    if (mode === 'off') continue;
    if (mode === 'custom') {
      const blob = await pickCustomGameSound(category);
      if (blob) {
        const url = URL.createObjectURL(blob);
        await playAudioFile(url);
        URL.revokeObjectURL(url);
        if (!isAudioSequenceActive(token)) return;
        continue;
      }
    }
    const played = item.audio ? await playAudioFile(item.audio) : false;
    if (!isAudioSequenceActive(token)) return;
    if (!played) await speakText(item.text, item.lang);
    if (!isAudioSequenceActive(token)) return;
  }
}
