import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

/** Route every HLS.js fetch through our CORS proxy, optionally with referrer + UA */
function makeProxyFetchSetup(httpReferrer, userAgent) {
  return (context, initParams) => {
    const rawUrl = context.url;
    if (
      rawUrl.startsWith('/api/cors-proxy') ||
      rawUrl.startsWith('/cors-proxy') ||
      rawUrl.includes('cors-proxy?')
    ) {
      return new Request(rawUrl, initParams);
    }
    let proxyUrl = `/api/cors-proxy?url=${encodeURIComponent(rawUrl)}`;
    if (httpReferrer) proxyUrl += `&ref=${encodeURIComponent(httpReferrer)}`;
    if (userAgent)    proxyUrl += `&ua=${encodeURIComponent(userAgent)}`;
    return new Request(proxyUrl, initParams);
  };
}

export default function VideoPlayer({ channel, volume, isMuted }) {
  const videoRef = useRef(null);
  const hlsRef  = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | playing | error | unsupported

  useEffect(() => {
    if (!channel?.url) { setStatus('error'); return; }
    const video = videoRef.current;
    if (!video) return;

    // Tear down previous instance
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setStatus('loading');

    if (Hls.isSupported()) {
      const fetchSetup = makeProxyFetchSetup(channel.httpReferrer, channel.userAgent);
      const hls = new Hls({
        enableWorker: false,          // keep off to avoid worker CORS issues
        lowLatencyMode: false,
        backBufferLength: 30,
        startLevel: -1,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 4,
        fetchSetup,
      });
      hlsRef.current = hls;

      hls.loadSource(channel.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setStatus('playing');
      });

      let netRetries = 0;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (netRetries < 3) {
              netRetries++;
              setTimeout(() => hls.startLoad(), 2000 * netRetries);
            } else {
              setStatus('error');
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            setStatus('error');
        }
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari) — route via proxy too
      video.src = `/api/cors-proxy?url=${encodeURIComponent(channel.url)}`;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
        setStatus('playing');
      }, { once: true });
      video.addEventListener('error', () => setStatus('error'), { once: true });
    } else {
      setStatus('unsupported');
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (video) { video.pause(); video.src = ''; }
    };
  }, [channel?.url, channel?.httpReferrer, channel?.userAgent]);

  // Volume / mute sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted  = isMuted;
    }
  }, [volume, isMuted]);

  return (
    <div className="video-wrapper" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        className="main-video"
        playsInline
        autoPlay
        muted={isMuted}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain', background: '#000',
          opacity: status === 'playing' ? 1 : 0,
        }}
      />

      {status === 'loading' && (
        <div className="video-overlay loading-overlay">
          <div className="spinner" />
          <span className="overlay-text">Tuning to CH {channel?.number}…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="video-overlay error-overlay">
          <div className="static-bg" />
          <div className="error-content">
            <div className="no-signal-bars">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="signal-bar" style={{ animationDelay: `${i * 0.07}s` }} />
              ))}
            </div>
            <p className="error-title">NO SIGNAL</p>
            <p className="error-ch">CH {channel?.number?.toString().padStart(3, '0')}</p>
            <p className="error-name">{channel?.name}</p>
            {channel?.isGeoBlocked && <p className="error-geo">⚠ Geo-restricted content</p>}
          </div>
        </div>
      )}

      {status === 'unsupported' && (
        <div className="video-overlay error-overlay">
          <div className="error-content">
            <p className="error-title">UNSUPPORTED FORMAT</p>
            <p className="error-name">HLS is not available in this browser</p>
          </div>
        </div>
      )}
    </div>
  );
}
