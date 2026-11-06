import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * CORS Proxy Middleware
 * Routes HLS stream requests through the local dev server so browsers
 * never make cross-origin requests directly (which most CDNs block).
 *
 * Usage: GET /cors-proxy?url=<encoded-stream-url>
 */
function corsProxy() {
  return {
    name: 'cors-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/cors-proxy') && !req.url?.startsWith('/api/cors-proxy')) return next()

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
          })
          return res.end()
        }

        const params = new URL(req.url, 'http://localhost').searchParams
        const target = params.get('url')
        const referer = params.get('ref') || ''
        const ua = params.get('ua') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        if (!target) {
          res.statusCode = 400
          return res.end('Missing url param')
        }

        try {
          const reqHeaders = {
            'User-Agent': ua,
            Accept: '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
          }
          if (referer) reqHeaders['Referer'] = referer

          const upstream = await fetch(target, {
            headers: reqHeaders,
            redirect: 'follow',
            signal: AbortSignal.timeout(12000),
          })

          const ct = upstream.headers.get('content-type') ?? 'application/octet-stream'
          const isM3U8 = target.includes('.m3u8') || ct.includes('mpegurl') || ct.includes('x-mpegURL')

          if (isM3U8) {
            const rawText = await upstream.text()
            // Rewrite relative URLs to absolute URLs based on target URL
            const rewritten = rawText.split('\n').map(line => {
              const trimmed = line.trim()
              if (!trimmed) return line
              if (trimmed.startsWith('#')) {
                // Check for URI="..." attribute in tags like EXT-X-KEY or EXT-X-MEDIA
                return line.replace(/URI="([^"]+)"/g, (match, uri) => {
                  if (uri.startsWith('http://') || uri.startsWith('https://')) return match
                  try {
                    const abs = new URL(uri, target).href
                    return `URI="${abs}"`
                  } catch {
                    return match
                  }
                })
              }
              // It's a URI line for sub-playlist or segment
              if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                return trimmed
              }
              try {
                return new URL(trimmed, target).href
              } catch {
                return trimmed
              }
            }).join('\n')

            res.writeHead(upstream.status, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': '*',
              'Content-Type': 'application/vnd.apple.mpegurl',
              'Cache-Control': 'no-cache',
            })
            return res.end(rewritten)
          }

          res.writeHead(upstream.status, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Content-Type': ct,
            'Cache-Control': 'no-cache',
          })
          res.end(Buffer.from(await upstream.arrayBuffer()))
        } catch (err) {
          // Network timeout or unreachable host
          res.statusCode = 502
          res.end(`Proxy error: ${err.message}`)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), corsProxy()],
})
