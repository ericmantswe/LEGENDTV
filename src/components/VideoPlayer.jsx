import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { translateToEnglish } from '../utils/translator.js';

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

export default function VideoPlayer({ channel, volume, isMuted, captionsEnabled = true }) {
  const videoRef         = useRef(null);
  const hlsRef           = useRef(null);
  const captionTimerRef  = useRef(null);
  const captionsEnabledRef = useRef(captionsEnabled); // stable ref for async callbacks
  const [status, setStatus] = useState('loading');
  const [activeCaption, setActiveCaption] = useState('');

  // Keep ref in sync
  useEffect(() => { captionsEnabledRef.current = captionsEnabled; }, [captionsEnabled]);

  /* ── Push a caption (translate first, then display) ─────── */
  const pushCaption = useCallback(async (text) => {
    if (!text?.trim()) return;
    if (!captionsEnabledRef.current) return;
    const clean = text.trim();

    const englishText = await translateToEnglish(clean);

    // Double-check still enabled after the async await
    if (!captionsEnabledRef.current) return;

    setActiveCaption(englishText || clean);
    if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    captionTimerRef.current = setTimeout(() => setActiveCaption(''), 6000);
  }, []);

  /* ── HLS / Video Stream Lifecycle ───────────────────────── */
  useEffect(() => {
    if (!channel?.url) { setStatus('error'); return; }
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    setStatus('loading');
    setActiveCaption('');

    if (Hls.isSupported()) {
      const fetchSetup = makeProxyFetchSetup(channel.httpReferrer, channel.userAgent);
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        backBufferLength: 30,
        startLevel: -1,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 4,
        fetchSetup,
        // Keep native rendering ON so the browser populates textTracks with live cues.
        // We suppress the visual output via CSS (video::cue transparent) and
        // display our own overlay from cuechange events.
        renderTextTracksNatively: true,
        enableCEA608Captions: true,
      });
      hlsRef.current = hls;

      hls.loadSource(channel.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setStatus('playing');

        if (hls.subtitleTracks?.length > 0 && captionsEnabledRef.current) {
          const enIdx = hls.subtitleTracks.findIndex(t =>
            t.lang?.toLowerCase().startsWith('en') ||
            t.name?.toLowerCase().includes('english') ||
            t.name?.toLowerCase().includes('cc')
          );
          hls.subtitleTrack = enIdx !== -1 ? enIdx : 0;
          hls.subtitleDisplay = false; // We render ourselves
        }
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        if (!data.subtitleTracks?.length || !captionsEnabledRef.current) return;
        const enIdx = data.subtitleTracks.findIndex(t =>
          t.lang?.toLowerCase().startsWith('en') ||
          t.name?.toLowerCase().includes('english') ||
          t.name?.toLowerCase().includes('cc')
        );
        hls.subtitleTrack = enIdx !== -1 ? enIdx : 0;
        hls.subtitleDisplay = false;
      });

      let netRetries = 0;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (netRetries < 3) { netRetries++; setTimeout(() => hls.startLoad(), 2000 * netRetries); }
            else setStatus('error');
            break;
          case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
          default: setStatus('error');
        }
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = `/api/cors-proxy?url=${encodeURIComponent(channel.url)}`;
      video.addEventListener('loadedmetadata', () => { video.play().catch(() => {}); setStatus('playing'); }, { once: true });
      video.addEventListener('error', () => setStatus('error'), { once: true });
    } else {
      setStatus('unsupported');
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (video) { video.pause(); video.src = ''; }
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    };
  }, [channel?.url, channel?.httpReferrer, channel?.userAgent]);

  /* ── Dynamic HLS subtitle track toggle ──────────────────── */
  useEffect(() => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (!captionsEnabled) {
      hls.subtitleTrack = -1;
      hls.subtitleDisplay = false;
      setActiveCaption('');
    } else if (hls.subtitleTracks?.length > 0) {
      const enIdx = hls.subtitleTracks.findIndex(t =>
        t.lang?.toLowerCase().startsWith('en') ||
        t.name?.toLowerCase().includes('english') ||
        t.name?.toLowerCase().includes('cc')
      );
      hls.subtitleTrack = enIdx !== -1 ? enIdx : 0;
      hls.subtitleDisplay = false;
    }
  }, [captionsEnabled]);

  /* ── Native TextTracks cuechange listener ────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video?.textTracks) return;

    const handleCueChange = (e) => {
      if (!captionsEnabledRef.current) return;
      const track = e.target;
      if (track.activeCues?.length > 0) {
        const text = Array.from(track.activeCues)
          .map(c => (c.getCueAsHTML ? c.getCueAsHTML().textContent : c.text))
          .filter(Boolean)
          .join(' ')
          .replace(/<[^>]*>/g, '') // strip any HTML tags
          .trim();
        if (text) pushCaption(text);
      }
    };

    const attachTrack = (tr) => {
      if (!tr) return;
      // MUST be 'showing' for cuechange to fire in Chrome/Edge.
      // Native visual rendering is suppressed via CSS video::cue { opacity: 0 }
      tr.mode = captionsEnabled ? 'showing' : 'disabled';
      tr.removeEventListener('cuechange', handleCueChange);
      tr.addEventListener('cuechange', handleCueChange);
    };

    for (let i = 0; i < video.textTracks.length; i++) attachTrack(video.textTracks[i]);

    const onAddTrack = (e) => attachTrack(e.track);
    video.textTracks.addEventListener('addtrack', onAddTrack);

    return () => {
      video.textTracks?.removeEventListener('addtrack', onAddTrack);
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].removeEventListener('cuechange', handleCueChange);
        // Reset to hidden on cleanup so they don't paint natively after unmount
        try { video.textTracks[i].mode = 'hidden'; } catch {}
      }
    };
  }, [captionsEnabled, status, pushCaption]);

  /* ── Volume / mute sync ─────────────────────────────────── */
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

      {/* ── Live Auto English Captions Overlay ── */}
      {captionsEnabled && activeCaption && (
        <div className="live-captions-container">
          <span className="live-caption-text">{activeCaption}</span>
        </div>
      )}

      {status === 'loading' && (
        <div className="video-overlay loading-overlay">
          <div className="spinner" />
          <span className="overlay-text">Tuning to CH {channel?.number}…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="video-overlay error-overlay">
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
