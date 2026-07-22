import { assetUrl } from '@/lib/assets';
import type { CardItem } from '@/types/card';

interface CardThumbStripProps {
  cards: CardItem[];
  index: number;
  onSelect: (index: number) => void;
}

export function CardThumbStrip({ cards, index, onSelect }: CardThumbStripProps) {
  if (cards.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto px-4 pb-2">
      <div className="mx-auto flex w-max gap-2">
        {cards.map((card, i) => (
          <button
            key={card.id}
            onClick={() => onSelect(i)}
            aria-label={card.en}
            className={`h-[50px] w-[50px] shrink-0 overflow-hidden rounded-xl border bg-white shadow-sm transition active:scale-90 ${
              i === index ? 'border-orange-400 ring-2 ring-orange-300' : 'border-white/80'
            }`}
          >
            <img
              src={assetUrl(card.image)}
              alt=""
              className="h-full w-full object-contain"
              draggable={false}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
