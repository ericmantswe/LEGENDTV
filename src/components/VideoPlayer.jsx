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

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export default function VideoPlayer({ channel, volume, isMuted, captionsEnabled = true }) {
  const videoRef = useRef(null);
  const hlsRef   = useRef(null);
  const recognitionRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | playing | error | unsupported
  const [activeCaption, setActiveCaption] = useState('');
  const captionTimerRef = useRef(null);

  /* Helper to set caption with auto-clear after 5 seconds of silence */
  const pushCaption = (text) => {
    if (!text || !text.trim()) return;
    setActiveCaption(text.trim());
    if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    captionTimerRef.current = setTimeout(() => {
      setActiveCaption('');
    }, 5000);
  };

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
        renderTextTracksNatively: true, // Native browser rendering ensures subtitles display directly on video
        enableCEA608Captions: true,
      });
      hlsRef.current = hls;

      hls.loadSource(channel.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setStatus('playing');

        // Look for English or available subtitle tracks in HLS manifest
        if (hls.subtitleTracks && hls.subtitleTracks.length > 0 && captionsEnabled) {
          const enIdx = hls.subtitleTracks.findIndex(t =>
            t.lang?.toLowerCase().startsWith('en') || t.name?.toLowerCase().includes('english') || t.name?.toLowerCase().includes('cc')
          );
          hls.subtitleTrack = enIdx !== -1 ? enIdx : 0;
          hls.subtitleDisplay = true;
        }
      });

      // Handle subtitle cues when HLS subtitles fire
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        if (!data.subtitleTracks || data.subtitleTracks.length === 0) return;
        if (captionsEnabled) {
          const enIdx = data.subtitleTracks.findIndex(t =>
            t.lang?.toLowerCase().startsWith('en') || t.name?.toLowerCase().includes('english') || t.name?.toLowerCase().includes('cc')
          );
          hls.subtitleTrack = enIdx !== -1 ? enIdx : 0;
          hls.subtitleDisplay = true;
        }
      });

      // CEA-608 / CEA-708 closed captions cues
      hls.on(Hls.Events.CUES_PARSED, (_, data) => {
        if (!captionsEnabled) return;
        if (data.cues && data.cues.length > 0) {
          const text = data.cues.map(c => c.text).filter(Boolean).join(' ');
          if (text) pushCaption(text);
        }
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
      // Native HLS (Safari)
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
      if (captionTimerRef.current) clearTimeout(captionTimerRef.current);
    };
  }, [channel?.url, channel?.httpReferrer, channel?.userAgent]);

  /* ── Dynamic HLS subtitle track toggle when captionsEnabled changes ─ */
  useEffect(() => {
    if (!hlsRef.current) return;
    const hls = hlsRef.current;
    if (captionsEnabled) {
      if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
        const enIdx = hls.subtitleTracks.findIndex(t =>
          t.lang?.toLowerCase().startsWith('en') || t.name?.toLowerCase().includes('english') || t.name?.toLowerCase().includes('cc')
        );
        hls.subtitleTrack = enIdx !== -1 ? enIdx : 0;
        hls.subtitleDisplay = true;
      }
    } else {
      hls.subtitleTrack = -1;
      hls.subtitleDisplay = false;
      setActiveCaption('');
    }
  }, [captionsEnabled]);

  /* ── Native TextTracks listener (for CEA-608 & WebVTT) ─── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks) return;

    const handleCueChange = (e) => {
      if (!captionsEnabled) return;
      const track = e.target;
      if (track.activeCues && track.activeCues.length > 0) {
        const text = Array.from(track.activeCues).map(c => c.text).filter(Boolean).join(' ');
        if (text) pushCaption(text);
      }
    };

    const attachTrack = (tr) => {
      if (!tr) return;
      tr.mode = captionsEnabled ? 'showing' : 'disabled';
      tr.removeEventListener('cuechange', handleCueChange);
      tr.addEventListener('cuechange', handleCueChange);
    };

    for (let i = 0; i < video.textTracks.length; i++) {
      attachTrack(video.textTracks[i]);
    }

    const onAddTrack = (e) => {
      attachTrack(e.track);
    };
    video.textTracks.addEventListener('addtrack', onAddTrack);

    return () => {
      if (video.textTracks) {
        video.textTracks.removeEventListener('addtrack', onAddTrack);
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].removeEventListener('cuechange', handleCueChange);
        }
      }
    };
  }, [captionsEnabled, status]);

  /* ── Live Auto English Speech Recognition (Web Speech API) ── */
  useEffect(() => {
    if (!captionsEnabled || !SpeechRecognition) return;

    let stopped = false;
    let rec = null;

    try {
      rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        if (stopped) return;
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          pushCaption(transcript);
        }
      };

      rec.onerror = (e) => {
        // Ignored gracefully (e.g. no-speech or network)
        if (e.error === 'no-speech' || e.error === 'aborted') return;
      };

      rec.onend = () => {
        if (!stopped && captionsEnabled) {
          try { rec.start(); } catch {}
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch {
      // Speech recognition not permitted or supported
    }

    return () => {
      stopped = true;
      if (rec) {
        try { rec.stop(); } catch {}
      }
      recognitionRef.current = null;
    };
  }, [captionsEnabled, channel?.number]);

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
          <span className="live-caption-badge">CC [EN]</span>
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
