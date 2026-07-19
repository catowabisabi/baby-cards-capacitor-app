/** 學習卡本體：大圖 + 英文詞 + 中文詞；掂下播發音 */
import { assetUrl } from '@/lib/assets';
import type { CardItem } from '@/types/card';

interface FlashCardProps {
  card: CardItem;
  onTap: () => void;
}

export function FlashCard({ card, onTap }: FlashCardProps) {
  return (
    <button
      onClick={onTap}
      aria-label={`${card.en} ${card.cn}，撳嚟再聽一次`}
      className="w-full max-w-sm rounded-[2.5rem] border-b-8 border-orange-200 bg-white p-6 shadow-lg transition active:scale-[0.97]"
    >
      <img
        key={card.id}
        src={assetUrl(card.image)}
        alt={card.en}
        className="mx-auto h-56 w-56 animate-[pop_0.35s_ease-out] object-contain sm:h-64 sm:w-64"
        draggable={false}
      />
      <p className="mt-4 text-4xl font-black tracking-wide text-slate-800">{card.en}</p>
      <p className="mt-1 text-3xl font-black text-orange-500">{card.cn}</p>
    </button>
  );
}
