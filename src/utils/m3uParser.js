/**
 * Parser for IPTV-org M3U playlists
 */
export function parseM3U(m3uContent, baseChannelNumber = 100) {
  if (!m3uContent) return [];

  const lines = m3uContent.split(/\r?\n/);
  const channels = [];
  let currentChannel = null;
  let chNum = baseChannelNumber;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Parse EXTINF metadata
      const idMatch = line.match(/tvg-id="([^"]*)"/i);
      const nameMatch = line.match(/tvg-name="([^"]*)"/i);
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      
      // Extract title after comma
      const commaIdx = line.lastIndexOf(',');
      let title = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : '';
      if (!title && nameMatch) title = nameMatch[1];
      if (!title) title = `Channel ${chNum}`;

      // Clean up common quality annotations like [Geo-blocked] or (1080p)
      const isGeoBlocked = title.includes('[Geo-blocked]');
      const cleanTitle = title.replace(/\[Geo-blocked\]/gi, '').replace(/\(\d+p\)/gi, '').trim();

      currentChannel = {
        number: chNum,
        id: idMatch ? idMatch[1] : `ch-${chNum}`,
        name: cleanTitle || title,
        rawName: title,
        logo: logoMatch ? logoMatch[1] : '',
        category: groupMatch ? groupMatch[1].split(';')[0].trim() : 'General',
        allCategories: groupMatch ? groupMatch[1].split(';').map(c => c.trim()) : ['General'],
        isGeoBlocked,
      };
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      if (currentChannel) {
        currentChannel.url = line;
        // Skip channels that are marked as explicitly geo-blocked if possible, or keep them with flag
        channels.push(currentChannel);
        chNum++;
        currentChannel = null;
      }
    }
  }

  return channels;
}

// Format channel number with leading zero e.g. 004
export function formatChannelNum(num) {
  return String(num).padStart(3, '0');
}

