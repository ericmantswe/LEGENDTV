import { useState, useEffect, useCallback, useRef } from 'react';
import VideoPlayer from './components/VideoPlayer.jsx';
import ChannelBanner from './components/ChannelBanner.jsx';
import LegendGuide from './components/LegendGuide.jsx';
import RemoteControl from './components/RemoteControl.jsx';
import ApiBrowser from './components/ApiBrowser.jsx';
import CountryModal from './components/CountryModal.jsx';
import BootSplash from './components/BootSplash.jsx';
import { DEFAULT_CHANNELS } from './data/defaultChannels.js';
import { loadCountryChannels, loadAllGlobalChannels } from './utils/iptvApi.js';
import { sounds } from './utils/audioFX.js';
import './App.css';

const VOLUME_STEP    = 10;
const BANNER_TIMEOUT = 4500;
const FAVORITES_KEY  = 'legendtv_favorites';

function readFavs() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; }
}
function writeFavs(arr) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr)); } catch {}
}

export default function App() {
  const [channels,          setChannels]          = useState(DEFAULT_CHANNELS);
  const [channelIndex,      setChannelIndex]       = useState(0);
  const [volume,            setVolume]             = useState(70);
  const [isMuted,           setIsMuted]            = useState(false);
  const [isGuideOpen,       setIsGuideOpen]        = useState(true);
  const [showBanner,        setShowBanner]         = useState(false);
  const [showRemote,        setShowRemote]         = useState(false);
  const [showApiBrowser,    setShowApiBrowser]     = useState(false);
  const [showCountryModal,  setShowCountryModal]   = useState(false);
  const [activeCountry,     setActiveCountry]      = useState(null);
  const [activeCountryName, setActiveCountryName]  = useState('Global');
  const [activeCountryFlag, setActiveCountryFlag]  = useState('🌐');
  const [isLoadingCountry,  setIsLoadingCountry]   = useState(false);
  const [onScreenNum,       setOnScreenNum]        = useState('');
  const [numpadTimeout,     setNumpadTimeout]      = useState(null);
  const [isFullscreen,      setIsFullscreen]       = useState(false);
  const [favorites,         setFavorites]          = useState(readFavs);
  const [captionsEnabled,   setCaptionsEnabled]    = useState(() => {
    try { return localStorage.getItem('legend_captions') !== 'false'; } catch { return true; }
  });
  const [isBooting,         setIsBooting]          = useState(true);
  const bannerTimer = useRef(null);

  const currentChannel = channels[channelIndex] || channels[0];

  /* ── Background loader for full global directory (1,500+ channels) ── */
  useEffect(() => {
    let active = true;
    loadAllGlobalChannels(1500)
      .then((globalList) => {
        if (!active || !globalList || globalList.length === 0) return;
        const defaultUrls = new Set(DEFAULT_CHANNELS.map(c => c.url));
        const filtered = globalList.filter(c => !defaultUrls.has(c.url));
        const combined = [
          ...DEFAULT_CHANNELS,
          ...filtered.map((c, i) => ({
            ...c,
            number: DEFAULT_CHANNELS.length + i + 1,
          })),
        ];
        setChannels(prev => (prev.length <= DEFAULT_CHANNELS.length ? combined : prev));
      })
      .catch((err) => {
        console.warn('Could not load global directory:', err);
      });
    return () => { active = false; };
  }, []);

  /* ── Fullscreen tracking ───────────────────────────────── */
  useEffect(() => {
    const onFsChange = () =>
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    sounds.playClick();
    const el = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el).catch(() => {});
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document).catch(() => {});
    }
  }, []);

  /* ── OSD banner ────────────────────────────────────────── */
  const showBannerBriefly = useCallback(() => {
    if (isGuideOpen) return;
    setShowBanner(true);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setShowBanner(false), BANNER_TIMEOUT);
  }, [isGuideOpen]);

  /* ── Channel switching ─────────────────────────────────── */
  const switchToChannel = useCallback((index) => {
    const i = ((index % channels.length) + channels.length) % channels.length;
    sounds.playChannelSwitch();
    setChannelIndex(i);
    if (!isGuideOpen) showBannerBriefly();
  }, [channels.length, isGuideOpen, showBannerBriefly]);

  const channelUp   = useCallback(() => switchToChannel(channelIndex + 1), [channelIndex, switchToChannel]);
  const channelDown = useCallback(() => switchToChannel(channelIndex - 1), [channelIndex, switchToChannel]);

  /* ── Volume ────────────────────────────────────────────── */
  const volumeUp = useCallback(() => {
    setIsMuted(false);
    setVolume(v => { const nv = Math.min(100, v + VOLUME_STEP); sounds.playVolumeChirp(400 + nv * 4); return nv; });
  }, []);
  const volumeDown = useCallback(() => {
    setVolume(v => { const nv = Math.max(0, v - VOLUME_STEP); sounds.playVolumeChirp(300 + nv * 4); return nv; });
  }, []);
  const toggleMute = useCallback(() => { sounds.playClick(); setIsMuted(m => !m); }, []);

  /* ── Guide toggle ──────────────────────────────────────── */
  const toggleGuide = useCallback(() => {
    sounds.playGuideSound(!isGuideOpen);
    setIsGuideOpen(g => !g);
    if (isGuideOpen) showBannerBriefly();
  }, [isGuideOpen, showBannerBriefly]);

  /* ── Favourites ────────────────────────────────────────── */
  const toggleFavorite = useCallback((channelNumber) => {
    setFavorites(prev => {
      const next = prev.includes(channelNumber)
        ? prev.filter(n => n !== channelNumber)
        : [...prev, channelNumber];
      writeFavs(next);
      return next;
    });
  }, []);

  /* ── Auto English Captions ──────────────────────────────── */
  const toggleCaptions = useCallback(() => {
    sounds.playClick();
    setCaptionsEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem('legend_captions', String(next)); } catch {}
      return next;
    });
  }, []);

  /* ── Country loader ────────────────────────────────────── */
  const handleSelectCountry = useCallback(async (code, name, flag) => {
    sounds.playClick();
    if (!code) {
      setActiveCountry(null);
      setActiveCountryName('Global Lineup');
      setActiveCountryFlag('🌐');
      setIsLoadingCountry(true);
      try {
        const globalList = await loadAllGlobalChannels(1500);
        const defaultUrls = new Set(DEFAULT_CHANNELS.map(c => c.url));
        const filtered = globalList.filter(c => !defaultUrls.has(c.url));
        const combined = [
          ...DEFAULT_CHANNELS,
          ...filtered.map((c, i) => ({
            ...c,
            number: DEFAULT_CHANNELS.length + i + 1,
          })),
        ];
        setChannels(combined);
      } catch {
        setChannels(DEFAULT_CHANNELS);
      } finally {
        setIsLoadingCountry(false);
      }
      setChannelIndex(0);
      sounds.playGuideSound(true);
      return;
    }
    setIsLoadingCountry(true);
    setActiveCountry(code); setActiveCountryName(name); setActiveCountryFlag(flag);
    try {
      const chs = await loadCountryChannels(code, 300);
      if (chs?.length > 0) { setChannels(chs); setChannelIndex(0); sounds.playGuideSound(true); }
    } catch (e) { console.warn('Country load failed:', e); }
    finally { setIsLoadingCountry(false); }
  }, []);

  /* ── API browser load ──────────────────────────────────── */
  const handleApiLoad = useCallback((apiChannels) => {
    const numbered = apiChannels.map((ch, i) => ({ ...ch, number: i + 1 }));
    setChannels(numbered); setChannelIndex(0);
    setActiveCountry('API'); setActiveCountryName('IPTV-org'); setActiveCountryFlag('🌐');
    sounds.playGuideSound(true);
  }, []);

  /* ── Global keyboard (TV mode — guide keys handled in LegendGuide) ── */
  useEffect(() => {
    const handleKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (isGuideOpen) return; // LegendGuide owns keys when open

      switch (e.key) {
        case 'PageUp':  case 'ArrowUp':    e.preventDefault(); channelUp();      break;
        case 'PageDown':case 'ArrowDown':  e.preventDefault(); channelDown();    break;
        case 'ArrowRight':                                      volumeUp();       break;
        case 'ArrowLeft':                                       volumeDown();     break;
        case 'f': case 'F': e.preventDefault(); toggleFullscreen(); break;
        case 'm': case 'M':                     toggleMute();       break;
        case 'g': case 'G': e.preventDefault(); toggleGuide();      break;
        case 'c': case 'C': e.preventDefault(); toggleCaptions();   break;
        case 'i': case 'I': setShowBanner(b => !b);                 break;
        case 'r': case 'R': setShowRemote(r => !r);                 break;
        case 'Escape':
          if (showCountryModal)  setShowCountryModal(false);
          else if (showApiBrowser) setShowApiBrowser(false);
          else toggleGuide();
          break;
        default:
          if (e.key >= '0' && e.key <= '9') {
            const newNum = onScreenNum + e.key;
            setOnScreenNum(newNum);
            sounds.playClick();
            if (numpadTimeout) clearTimeout(numpadTimeout);
            const t = setTimeout(() => {
              const idx = channels.findIndex(c => c.number === parseInt(newNum, 10));
              if (idx !== -1) switchToChannel(idx);
              setOnScreenNum('');
            }, 1200);
            setNumpadTimeout(t);
          }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isGuideOpen, showApiBrowser, showCountryModal, channelUp, channelDown, volumeUp,
      volumeDown, toggleMute, toggleGuide, toggleFullscreen, toggleCaptions, onScreenNum, numpadTimeout,
      channels, switchToChannel]);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="xfinity-app-root">

      {/* Video fills the full screen at all times */}
      <div className="legend-tv-bg">
        <VideoPlayer
          channel={currentChannel}
          volume={volume}
          isMuted={isMuted}
          captionsEnabled={captionsEnabled}
        />
      </div>

      {/* Guide overlay */}
      {isGuideOpen && (
        <LegendGuide
          channels={channels}
          currentChannel={currentChannel}
          onSelectChannel={(ch) => {
            const idx = channels.findIndex(c => c.number === ch.number);
            if (idx !== -1) setChannelIndex(idx);
          }}
          onCloseGuide={() => { setIsGuideOpen(false); showBannerBriefly(); }}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onOpenCountryModal={() => setShowCountryModal(true)}
          onOpenApiBrowser={() => setShowApiBrowser(true)}
          onShowRemote={() => setShowRemote(r => !r)}
          activeCountry={activeCountry}
          activeCountryName={activeCountryName}
          activeCountryFlag={activeCountryFlag}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          captionsEnabled={captionsEnabled}
          onToggleCaptions={toggleCaptions}
        />
      )}

      {/* TV-mode hover overlay (controls + OSD banner) */}
      {!isGuideOpen && (
        <div
          className="legend-tv-overlay"
          onClick={showBannerBriefly}
          onDoubleClick={toggleFullscreen}
        >
          {/* Top bar — appears on hover */}
          <div className="fullscreen-top-bar">
            <div className="top-brand">
              <img
                src="/Vibrant%20legendER%20TV%20Gradient%20Logo.png"
                alt="LEGEND ER TV"
                className="top-brand-logo-img"
              />
              <span className="brand-channel-badge">
                CH {currentChannel?.number} • {currentChannel?.callsign || currentChannel?.name}
              </span>
            </div>
            <div className="top-actions">
              <button className="top-btn" onClick={e => { e.stopPropagation(); toggleGuide(); }}>
                📺 Guide (G)
              </button>
              <button className="top-btn" onClick={e => { e.stopPropagation(); toggleFullscreen(); }}>
                {isFullscreen ? '⛶ Exit' : '⛶ Fullscreen'}
              </button>
            </div>
          </div>

          {/* Volume HUD (bottom-left, always visible in TV mode) */}
          {!isMuted && (
            <div className="legend-vol-hud">
              <div className="vol-track">
                <div className="vol-fill" style={{ width: `${volume}%` }} />
              </div>
              <span className="vol-label">{volume}%</span>
            </div>
          )}
          {isMuted && <div className="legend-muted-badge">🔇 MUTED</div>}

          {/* OSD channel banner */}
          <ChannelBanner
            channel={currentChannel}
            visible={showBanner}
            onOpenGuide={toggleGuide}
            activeCountry={activeCountry}
          />
        </div>
      )}

      {/* First Boot Loading Screen with Vibrant Logo */}
      {isBooting && <BootSplash onComplete={() => setIsBooting(false)} />}

      {/* Country loading toast */}
      {isLoadingCountry && (
        <div className="fetch-loading">
          <div className="spinner" />
          <span>Loading {activeCountryName} channels…</span>
        </div>
      )}

      {/* Channel number keypad HUD */}
      {onScreenNum && (
        <div className="xfinity-digit-hud">
          <span className="digit-prefix">CH</span>
          <span className="digit-val">{onScreenNum}</span>
        </div>
      )}

      {/* Floating remote */}
      {showRemote && (
        <div className="floating-remote-wrap">
          <div className="remote-close-bar">
            <span>LEGEND ER TV — REMOTE</span>
            <button onClick={() => setShowRemote(false)}>✕</button>
          </div>
          <RemoteControl
            onChannelUp={channelUp}
            onChannelDown={channelDown}
            onVolumeUp={volumeUp}
            onVolumeDown={volumeDown}
            onMute={toggleMute}
            onGuide={toggleGuide}
            onInfo={showBannerBriefly}
            onToggleCaptions={toggleCaptions}
            captionsEnabled={captionsEnabled}
            isMuted={isMuted}
            volume={volume}
            currentChannel={currentChannel}
          />
        </div>
      )}

      {/* Country modal */}
      {showCountryModal && (
        <CountryModal
          activeCountry={activeCountry}
          onSelectCountry={handleSelectCountry}
          onClose={() => setShowCountryModal(false)}
        />
      )}

      {/* IPTV-org API Browser */}
      {showApiBrowser && (
        <ApiBrowser
          onLoadChannels={handleApiLoad}
          onClose={() => setShowApiBrowser(false)}
        />
      )}
    </div>
  );
}
