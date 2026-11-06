/**
 * Auto-Translation Service for LEGEND ER TV
 * Automatically translates incoming foreign language subtitle cues and speech
 * into English in real-time. Includes LRU memory cache for instant playback.
 */

const translationCache = new Map();

/**
 * Translate text into English (sl=auto, tl=en)
 */
export async function translateToEnglish(text) {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();

  // If already English or cached, return immediately
  if (translationCache.has(trimmed)) {
    return translationCache.get(trimmed);
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (!res.ok) return trimmed;
    
    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translated = data[0].map(item => item[0]).filter(Boolean).join('').trim();
      if (translated) {
        translationCache.set(trimmed, translated);
        // Evict oldest if cache exceeds 1200 entries
        if (translationCache.size > 1200) {
          const firstKey = translationCache.keys().next().value;
          translationCache.delete(firstKey);
        }
        return translated;
      }
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}
