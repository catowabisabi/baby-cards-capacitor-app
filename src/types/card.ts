/** 一張學習卡：一張圖、一個英文詞、一個中文詞、中英兩個發音 */
export interface CardItem {
  id: string;
  en: string;
  cn: string;
  image: string;
  /** 冇錄音檔就係 null，播放時會用裝置語音合成 fallback */
  audioEn: string | null;
  audioCn: string | null;
  defaultImage?: string;
  defaultAudioEn?: string | null;
  defaultAudioCn?: string | null;
  hasImageOverride?: boolean;
  hasAudioEnOverride?: boolean;
  hasAudioCnOverride?: boolean;
}

/** 一個主題 = cards/ 入面一個子文件夾 */
export interface Topic {
  id: string;
  en: string;
  cn: string;
  /** 主題封面 = 文件夾入面第一張卡嘅圖 */
  cover: string;
  cards: CardItem[];
}

export interface CardsManifest {
  generatedAt: string;
  topics: Topic[];
}
