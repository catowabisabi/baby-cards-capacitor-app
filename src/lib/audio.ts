/**
 * 發音服務
 * 優先播放 cards/ 文件夾入面嘅 mp3（例如你自己錄嘅廣東話 cat-cn.mp3），
 * 冇檔案就用裝置內建語音合成（Web Speech API）fallback：
 * 中文用 zh-HK（廣東話），英文用 en-US。
 */
import type { CardItem } from '@/types/card';
import { assetUrl } from './assets';

let current: HTMLAudioElement | null = null;
let playToken = 0;

function stopCurrent() {
  current?.pause();
  current = null;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/** 即刻停止所有發聲 */
export function stopAudio() {
  playToken++;
  stopCurrent();
}

function playFile(src: string): Promise<void> {
  return new Promise((resolve) => {
    const a = new Audio(assetUrl(src));
    current = a;
    a.onended = () => resolve();
    a.onerror = () => resolve();
    a.play().catch(() => resolve());
  });
}

let voicesPromise: Promise<void> | null = null;

/** 等瀏覽器 load 好語音列表（有啲瀏覽器一開始係空） */
function ensureVoices(): Promise<void> {
  if (!('speechSynthesis' in window)) return Promise.resolve();
  if (window.speechSynthesis.getVoices().length > 0) return Promise.resolve();
  voicesPromise ??= new Promise((res) => {
    const done = () => res();
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1200);
  });
  return voicesPromise;
}

async function speak(text: string, lang: string): Promise<void> {
  if (!('speechSynthesis' in window)) return;
  await ensureVoices();
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang === lang) ||
      voices.find((v) => v.lang.startsWith(lang.split('-')[0]));
    if (voice) utter.voice = voice;
    utter.rate = 0.85; // 小朋友聽，講慢少少
    utter.pitch = 1.1;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    utter.onend = finish;
    utter.onerror = finish;
    window.speechSynthesis.speak(utter);
    setTimeout(finish, 6000); // 保險：有啲平台唔觸發 onend
  });
}

/**
 * 播放一張卡嘅發音。
 * mode 'both' 會先播英文、再播中文；切卡或再撳會自動停返上一個。
 */
export async function playCard(card: CardItem, mode: 'en' | 'cn' | 'both' = 'both') {
  const token = ++playToken;
  stopCurrent();
  const alive = () => token === playToken;

  if ((mode === 'en' || mode === 'both') && alive()) {
    if (card.audioEn) await playFile(card.audioEn);
    else await speak(card.en, 'en-US');
  }
  if ((mode === 'cn' || mode === 'both') && alive()) {
    if (card.audioCn) await playFile(card.audioCn);
    else await speak(card.cn, 'zh-HK');
  }
}
