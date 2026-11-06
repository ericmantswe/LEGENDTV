/**
 * Vercel Serverless Function for HLS CORS Proxy
 * Endpoint: /api/cors-proxy?url=<encoded-url>&ref=<optional-referer>&ua=<optional-user-agent>
 */

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { url: target, ref: referer, ua: userAgent } = req.query;

  if (!target) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const reqHeaders = {
      'User-Agent':
        userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    };
    if (referer) {
      reqHeaders['Referer'] = referer;
    }

    const upstream = await fetch(target, {
      headers: reqHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });

    const ct = upstream.headers.get('content-type') ?? 'application/octet-stream';
    const isM3U8 =
      target.includes('.m3u8') ||
      ct.includes('mpegurl') ||
      ct.includes('x-mpegURL');

    res.setHeader('Cache-Control', 'no-cache');

    if (isM3U8) {
      const rawText = await upstream.text();
      // Rewrite relative URLs to absolute URLs based on target URL
      const rewritten = rawText
        .split('\n')
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith('#')) {
            // Check for URI="..." attribute in tags like EXT-X-KEY or EXT-X-MEDIA
            return line.replace(/URI="([^"]+)"/g, (match, uri) => {
              if (uri.startsWith('http://') || uri.startsWith('https://')) return match;
              try {
                const abs = new URL(uri, target).href;
                return `URI="${abs}"`;
              } catch {
                return match;
              }
            });
          }
          // Segment or sub-playlist URL
          if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
          }
          try {
            return new URL(trimmed, target).href;
          } catch {
            return trimmed;
          }
        })
        .join('\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.status(upstream.status).send(rewritten);
    }

    // Binary segment (.ts, .aac, .m4s, etc.)
    res.setHeader('Content-Type', ct);
    const arrayBuffer = await upstream.arrayBuffer();
    return res.status(upstream.status).send(Buffer.from(arrayBuffer));
  } catch (err) {
    return res.status(502).send(`Proxy error: ${err.message}`);
  }
}

