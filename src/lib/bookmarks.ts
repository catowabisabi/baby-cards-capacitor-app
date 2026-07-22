const BOOKMARKS_KEY = 'babycards_bookmarks';

export function cardKey(topicId: string, cardId: string) {
  return `${topicId}/${cardId}`;
}

export function loadBookmarks(): Set<string> {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    const values = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(values.filter((value) => typeof value === 'string'));
  } catch {
    return new Set();
  }
}

export function saveBookmarks(bookmarks: Set<string>) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...bookmarks]));
  } catch {
    /* ignore */
  }
}

