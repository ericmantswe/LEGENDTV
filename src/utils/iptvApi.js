import { parseM3U } from './m3uParser.js';

/**
 * IPTV-org API integration
 * Docs: https://github.com/iptv-org/api
 */

const BASE_API = 'https://iptv-org.github.io/api';
const BASE_M3U_COUNTRIES = 'https://iptv-org.github.io/iptv/countries';

const _cache = {};

async function fetchJSON(endpoint) {
  if (_cache[endpoint]) return _cache[endpoint];
  const res = await fetch(`${BASE_API}/${endpoint}`);
  if (!res.ok) throw new Error(`API fetch failed: ${endpoint} (${res.status})`);
  const data = await res.json();
  _cache[endpoint] = data;
  return data;
}

/**
 * Fast loading of country channels via IPTV-org country M3U playlists
 * e.g. "US" -> https://iptv-org.github.io/iptv/countries/us.m3u
 */
export async function loadCountryChannels(countryCode, limit = 250) {
  const code = countryCode.toLowerCase().trim();
  const url = `${BASE_M3U_COUNTRIES}/${code}.m3u`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load channels for ${countryCode.toUpperCase()} (${res.status})`);
  const text = await res.text();

  const channels = parseM3U(text, 1);
  return channels.slice(0, limit);
}

/**
 * Popular Country Presets for quick switching in the Guide UI
 */
export const POPULAR_COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
];

/**
 * Load channels + streams from the API, merged into one array.
 */
export async function loadApiChannels({
  country = null,
  category = null,
  language = null,
  noNsfw = true,
  limit = 300,
} = {}) {
  const [rawChannels, rawStreams] = await Promise.all([
    fetchJSON('channels.json'),
    fetchJSON('streams.json'),
  ]);

  const streamMap = {};
  for (const s of rawStreams) {
    const id = s.channel?.split('@')[0];
    if (id && s.url && !streamMap[id]) {
      streamMap[id] = s;
    }
  }

  const result = [];
  let chNum = 1;

  for (const ch of rawChannels) {
    if (!ch.id || ch.closed) continue;
    if (noNsfw && ch.is_nsfw) continue;
    if (country && ch.country !== country) continue;
    if (category && !ch.categories?.includes(category)) continue;
    if (language && !ch.languages?.includes(language)) continue;

    const stream = streamMap[ch.id] || streamMap[ch.id.split('.')[0]];
    if (!stream?.url) continue;

    result.push({
      number: chNum++,
      id: ch.id,
      name: ch.name,
      callsign: ch.network || ch.country || '',
      category: ch.categories?.[0]
        ? capitalise(ch.categories[0])
        : 'General',
      allCategories: (ch.categories || []).map(capitalise),
      country: ch.country,
      languages: ch.languages || [],
      logo: ch.logo || '',
      url: stream.url,
      httpReferrer: stream.http_referrer || '',
      userAgent: stream.user_agent || '',
      website: ch.website || '',
      rating: ch.is_nsfw ? 'TV-MA' : 'TV-PG',
      resolution: 'HD',
      description: `${ch.name} — live ${ch.categories?.join(', ') || 'TV'} broadcast from ${ch.country || 'international'}.`,
      isGeoBlocked: false,
      fromApi: true,
    });

    if (result.length >= limit) break;
  }

  return result;
}

export async function loadCountries() {
  return fetchJSON('countries.json');
}

export async function loadCategories() {
  return fetchJSON('categories.json');
}

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}
