/**
 * EPG Service for LEGEND ER TV
 * Fetches real broadcast schedules and full 7-day weekly schedules
 * using public television guide APIs (TVmaze REST API + Web schedule).
 * Completely free, no API keys, CORS-friendly, cached locally.
 */

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours cache
const weeklyCache = new Map(); // countryCode -> { timestamp, showsByNetwork, allShows }

/**
 * Format time range for broadcast listings (e.g. "8:00p - 9:00p")
 */
export function formatTimeRange(start, end) {
  if (!start) return '';
  const f = (d) => {
    const date = new Date(d);
    let h = date.getHours() % 12 || 12;
    let m = date.getMinutes().toString().padStart(2, '0');
    let ap = date.getHours() >= 12 ? 'p' : 'a';
    return `${h}:${m} ${ap}`;
  };
  return end ? `${f(start)} - ${f(end)}` : f(start);
}

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDateYMD(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the next 7 days starting from today: [YYYY-MM-DD, ...]
 */
export function getNext7Days(startDate = new Date()) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    days.push(formatDateYMD(d));
  }
  return days;
}

/**
 * Clean HTML tags from API synopsis/summaries
 */
export function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

/**
 * Normalizes channel names to match broadcast network names in TV schedules
 */
export function getNetworkKeywords(channel) {
  if (!channel) return [];
  const raw = `${channel.name || ''} ${channel.callsign || ''} ${channel.id || ''}`.toLowerCase();
  
  const keywords = [];
  const map = [
    { key: 'nbc', match: ['nbc'] },
    { key: 'cbs', match: ['cbs'] },
    { key: 'abc', match: ['abc'] },
    { key: 'fox', match: ['fox news', 'fox sports', 'fox'] },
    { key: 'cnn', match: ['cnn'] },
    { key: 'pbs', match: ['pbs'] },
    { key: 'espn', match: ['espn'] },
    { key: 'syfy', match: ['syfy', 'scifi'] },
    { key: 'discovery', match: ['discovery'] },
    { key: 'msnbc', match: ['msnbc', 'ms now'] },
    { key: 'golf', match: ['golf'] },
    { key: 'bravo', match: ['bravo'] },
    { key: 'e!', match: ['e!', 'eentertainment'] },
    { key: 'universal', match: ['universal', 'filmrise'] },
    { key: 'cw', match: ['cw', 'the cw'] },
    { key: 'bbc', match: ['bbc one', 'bbc two', 'bbc'] },
    { key: 'bloomberg', match: ['bloomberg'] },
    { key: 'newsmax', match: ['newsmax'] },
    { key: 'telemundo', match: ['telemundo'] },
    { key: 'univision', match: ['univision'] },
    { key: 'tlc', match: ['tlc'] },
    { key: 'a&e', match: ['a&e', 'aetv'] },
    { key: 'comedy central', match: ['comedy central'] },
    { key: 'disney', match: ['disney'] },
    { key: 'nickelodeon', match: ['nickelodeon', 'nick'] },
  ];

  for (const item of map) {
    if (item.match.some(m => raw.includes(m))) {
      keywords.push(item.key);
    }
  }

  // Also include first word of channel name
  const firstWord = (channel.name || '').trim().split(/\s+/)[0]?.toLowerCase();
  if (firstWord && firstWord.length > 2 && !keywords.includes(firstWord)) {
    keywords.push(firstWord);
  }

  return keywords;
}

/**
 * Load full 7-day weekly schedule for a country
 */
export async function loadWeeklySchedule(countryCode = 'US') {
  const code = (countryCode || 'US').toUpperCase();
  const cached = weeklyCache.get(code);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  // Try reading from localStorage for instant offline access
  const storageKey = `legend_epg_week_${code}`;
  try {
    const local = localStorage.getItem(storageKey);
    if (local) {
      const parsed = JSON.parse(local);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        weeklyCache.set(code, parsed);
        // Silently refresh in background
        fetchFreshWeeklySchedule(code, storageKey);
        return parsed;
      }
    }
  } catch {}

  return await fetchFreshWeeklySchedule(code, storageKey);
}

async function fetchFreshWeeklySchedule(code, storageKey) {
  const dates = getNext7Days(new Date());
  
  try {
    // Fetch all 7 days in parallel
    const dayFetches = dates.map(async (date) => {
      try {
        const res = await fetch(`https://api.tvmaze.com/schedule?country=${code}&date=${date}`);
        if (!res.ok) return [];
        const items = await res.json();
        return Array.isArray(items) ? items : [];
      } catch {
        return [];
      }
    });

    const dayResults = await Promise.all(dayFetches);
    const allRaw = dayResults.flat();

    // Index shows by network name
    const showsByNetwork = {};
    for (const item of allRaw) {
      const netName = (item.show?.network?.name || item.show?.webChannel?.name || '').toLowerCase();
      if (!netName) continue;

      const prog = {
        id: item.id,
        title: item.show?.name || item.name,
        episodeTitle: item.name && item.name !== item.show?.name ? item.name : '',
        network: item.show?.network?.name || item.show?.webChannel?.name,
        airdate: item.airdate,
        airtime: item.airtime,
        startTime: item.airstamp ? new Date(item.airstamp) : new Date(`${item.airdate}T${item.airtime || '00:00'}:00`),
        runtime: item.runtime || 60,
        endTime: item.airstamp
          ? new Date(new Date(item.airstamp).getTime() + (item.runtime || 60) * 60000)
          : new Date(new Date(`${item.airdate}T${item.airtime || '00:00'}:00`).getTime() + (item.runtime || 60) * 60000),
        description: stripHtml(item.summary) || stripHtml(item.show?.summary) || '',
        rating: item.show?.rating?.average ? `TV-${Math.round(item.show.rating.average)}` : 'TV-PG',
        image: item.image?.medium || item.show?.image?.medium || null,
        genres: item.show?.genres || [],
      };

      if (!showsByNetwork[netName]) showsByNetwork[netName] = [];
      showsByNetwork[netName].push(prog);
    }

    // Sort each network's shows chronologically
    for (const net in showsByNetwork) {
      showsByNetwork[net].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    }

    const cacheEntry = {
      timestamp: Date.now(),
      showsByNetwork,
      dates,
    };

    weeklyCache.set(code, cacheEntry);
    try {
      localStorage.setItem(storageKey, JSON.stringify(cacheEntry));
    } catch {}

    return cacheEntry;
  } catch (err) {
    console.warn(`EPG fetch failed for ${code}:`, err);
    return { timestamp: Date.now(), showsByNetwork: {}, dates };
  }
}

/**
 * Get all shows scheduled for a channel across the week, grouped by day
 */
export async function getChannelWeeklySchedule(channel, countryCode = 'US') {
  if (!channel) return [];
  const scheduleData = await loadWeeklySchedule(countryCode);
  const keywords = getNetworkKeywords(channel);
  const showsByNet = scheduleData?.showsByNetwork || {};

  // Find matching shows from any matching network keyword
  let matchedShows = [];
  for (const net in showsByNet) {
    const netLower = net.toLowerCase();
    if (keywords.some(k => netLower.includes(k) || k.includes(netLower))) {
      matchedShows.push(...showsByNet[net]);
    }
  }

  // Deduplicate by show ID
  const seen = new Set();
  const uniqueShows = matchedShows.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  // Sort chronologically
  uniqueShows.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  // Group by day for the 7 days of the week
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayYMD = formatDateYMD(new Date());

  const daysMap = {};
  for (const dateStr of scheduleData.dates || getNext7Days()) {
    const d = new Date(`${dateStr}T12:00:00`);
    const dayName = dayNames[d.getDay()];
    const isToday = dateStr === todayYMD;
    daysMap[dateStr] = {
      date: dateStr,
      dayName,
      dayLabel: isToday ? `Today (${dayName.slice(0, 3)})` : `${dayName.slice(0, 3)} ${d.getDate()}`,
      isToday,
      shows: [],
    };
  }

  for (const s of uniqueShows) {
    if (daysMap[s.airdate]) {
      daysMap[s.airdate].shows.push(s);
    }
  }

  return Object.values(daysMap);
}

/**
 * Get current show and next show playing right now for a channel
 */
export async function getLiveCurrentAndNext(channel, countryCode = 'US', now = new Date()) {
  if (!channel) return null;
  const scheduleData = await loadWeeklySchedule(countryCode);
  const keywords = getNetworkKeywords(channel);
  const showsByNet = scheduleData?.showsByNetwork || {};

  let matchedShows = [];
  for (const net in showsByNet) {
    const netLower = net.toLowerCase();
    if (keywords.some(k => netLower.includes(k) || k.includes(netLower))) {
      matchedShows.push(...showsByNet[net]);
    }
  }

  if (matchedShows.length === 0) return null;

  matchedShows.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const nowMs = now.getTime();
  let current = null;
  let next = null;

  // 1. Check if a show's broadcast window actively covers `now`
  for (let i = 0; i < matchedShows.length; i++) {
    const s = matchedShows[i];
    const sStart = s.startTime.getTime();
    const sEnd = s.endTime.getTime();

    if (nowMs >= sStart && nowMs < sEnd) {
      current = s;
      next = matchedShows[i + 1] || null;
      break;
    }
  }

  // 2. If no show is currently active (e.g. overnight gap or upcoming evening broadcast),
  // pick the next upcoming show today, or the latest broadcast
  if (!current) {
    const upcomingIdx = matchedShows.findIndex(s => s.startTime.getTime() > nowMs);
    if (upcomingIdx !== -1) {
      current = matchedShows[upcomingIdx];
      next = matchedShows[upcomingIdx + 1] || null;
    } else {
      current = matchedShows[matchedShows.length - 1];
    }
  }

  if (!current) return null;

  const total = current.endTime.getTime() - current.startTime.getTime();
  const elapsed = Math.max(0, Math.min(total, nowMs - current.startTime.getTime()));
  const progressPercent = total > 0 ? Math.round((elapsed / total) * 100) : 0;
  const remainingMinutes = Math.max(0, Math.round((current.endTime.getTime() - nowMs) / 60000));

  return {
    current,
    next,
    progressPercent,
    remainingMinutes,
  };
}
