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
let currentResolve: (() => void) | null = null;
let audioContext: AudioContext | null = null;
let currentSources: AudioBufferSourceNode[] = [];

function stopCurrent() {
  current?.pause();
  current = null;
  currentSources.forEach((source) => {
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
  });
  currentSources = [];
  currentResolve?.();
  currentResolve = null;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/** 即刻停止所有發聲 */
export function stopAudio() {
  playToken++;
  stopCurrent();
}

export function beginAudioSequence(): number {
  playToken++;
  stopCurrent();
  return playToken;
}

export function isAudioSequenceActive(token: number): boolean {
  return token === playToken;
}

function playFile(src: string): Promise<void> {
  return new Promise((resolve) => {
    const a = new Audio(assetUrl(src));
    current = a;
    const stopped = resolve;
    currentResolve = stopped;
    const finish = () => {
      if (current === a) current = null;
      if (currentResolve === stopped) currentResolve = null;
      resolve();
    };
    a.onended = finish;
    a.onerror = finish;
    a.play().catch(finish);
  });
}

export async function playAudioFile(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    stopCurrent();
    const a = new Audio(assetUrl(src));
    current = a;
    const stopped = () => resolve(false);
    currentResolve = stopped;
    const finish = (ok: boolean) => {
      if (current === a) current = null;
      if (currentResolve === stopped) currentResolve = null;
      resolve(ok);
    };
    a.onended = () => finish(true);
    a.onerror = () => finish(false);
    a.play().then(() => undefined).catch(() => finish(false));
  });
}

export async function playAudioFilesGapless(srcs: string[]): Promise<boolean> {
  if (srcs.length === 0 || !('AudioContext' in window)) return false;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') await audioContext.resume();
    const buffers = await Promise.all(
      srcs.map(async (src) => {
        const response = await fetch(assetUrl(src));
        if (!response.ok) throw new Error(`Audio fetch failed: ${src}`);
        const data = await response.arrayBuffer();
        return audioContext!.decodeAudioData(data);
      })
    );

    return await new Promise<boolean>((resolve) => {
      currentSources = [];
      let startAt = audioContext!.currentTime + 0.03;
      let done = false;
      const stopped = () => {
        if (!done) {
          done = true;
          resolve(false);
        }
      };
      currentResolve = stopped;
      buffers.forEach((buffer, index) => {
        const source = audioContext!.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext!.destination);
        source.start(startAt);
        startAt += buffer.duration;
        currentSources.push(source);
        if (index === buffers.length - 1) {
          source.onended = () => {
            if (!done) {
              done = true;
              currentSources = [];
              if (currentResolve === stopped) currentResolve = null;
              resolve(true);
            }
          };
        }
      });
    });
  } catch {
    currentSources = [];
    return false;
  }
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

export async function speakText(text: string, lang: string): Promise<void> {
  beginAudioSequence();
  await speak(text, lang);
}

export async function speakInCurrentSequence(text: string, lang: string): Promise<void> {
  await speak(text, lang);
}

/**
 * 播放一張卡嘅發音。
 * mode 'both' 會先播英文、再播中文；切卡或再撳會自動停返上一個。
 */
export async function playCard(card: CardItem, mode: 'en' | 'cn' | 'both' = 'both') {
  const token = beginAudioSequence();
  const alive = () => isAudioSequenceActive(token);

  if ((mode === 'en' || mode === 'both') && alive()) {
    if (card.audioEn) await playFile(card.audioEn);
    else await speak(card.en, 'en-US');
  }
  if ((mode === 'cn' || mode === 'both') && alive()) {
    if (card.audioCn) await playFile(card.audioCn);
    else await speak(card.cn, 'zh-HK');
  }
}
