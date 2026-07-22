import { Bookmark } from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import type { CardItem } from '@/types/card';

interface FlashCardProps {
  card: CardItem;
  onTap: () => void;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
  showCaption?: boolean;
}

export function FlashCard({
  card,
  onTap,
  bookmarked = false,
  onToggleBookmark,
  showCaption = true,
}: FlashCardProps) {
  return (
    <div className="w-full max-w-sm">
      <button
        onClick={onTap}
        aria-label={`${card.en} ${card.cn}`}
        className="relative aspect-square w-full overflow-hidden rounded-[2rem] border-b-8 border-orange-200 bg-white shadow-lg transition active:scale-[0.97]"
      >
        <div className="h-full w-full overflow-hidden rounded-[1.55rem] p-3">
          <img
            key={card.id}
            src={assetUrl(card.image)}
            alt={card.en}
            className="h-full w-full animate-[pop_0.35s_ease-out] rounded-[1.25rem] object-contain"
            draggable={false}
          />
        </div>
        {onToggleBookmark && (
          <span
            role="button"
            tabIndex={0}
            aria-label={bookmarked ? '移除書簽' : '加入書簽'}
            onClick={(event) => {
              event.stopPropagation();
              onToggleBookmark();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                onToggleBookmark();
              }
            }}
            className={`absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full shadow-md ${
              bookmarked ? 'bg-orange-400 text-white' : 'bg-white/90 text-slate-400'
            }`}
          >
            <Bookmark
              className="h-5 w-5"
              fill={bookmarked ? 'currentColor' : 'none'}
            />
          </span>
        )}
      </button>
      {showCaption && (
        <div className="mt-4 text-center">
          <p className="text-4xl font-black tracking-wide text-slate-800">{card.en}</p>
          <p className="mt-1 text-3xl font-black text-orange-500">{card.cn}</p>
        </div>
      )}
    </div>
  );
}
