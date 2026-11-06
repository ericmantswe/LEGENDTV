import { useState, useEffect, useCallback, useRef } from 'react';
import VideoPlayer from './components/VideoPlayer.jsx';
import ChannelBanner from './components/ChannelBanner.jsx';
import LegendGuide from './components/LegendGuide.jsx';
import RemoteControl from './components/RemoteControl.jsx';
import ApiBrowser from './components/ApiBrowser.jsx';
import CountryModal from './components/CountryModal.jsx';
import Dock from './components/Dock.jsx';
import {
  Tv,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Globe,
  Gamepad2,
  ChevronUp,
  ChevronDown,
  Star,
} from 'lucide-react';
import { DEFAULT_CHANNELS } from './data/defaultChannels.js';
import { loadCountryChannels } from './utils/iptvApi.js';
import { sounds } from './utils/audioFX.js';
import './App.css';

const VOLUME_STEP = 10;
const BANNER_TIMEOUT = 4500;
const FAVORITES_KEY = 'legendtv_favorites';

function readFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; }
}
function writeFavorites(arr) {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(arr)); } catch {}
}

export default function App() {
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [channelIndex, setChannelIndex] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [showRemote, setShowRemote] = useState(false);
  const [showApiBrowser, setShowApiBrowser] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [activeCountry, setActiveCountry] = useState(null);
  const [activeCountryName, setActiveCountryName] = useState('Global Lineup');
  const [activeCountryFlag, setActiveCountryFlag] = useState('🌐');
  const [isLoadingCountry, setIsLoadingCountry] = useState(false);
  const [onScreenNum, setOnScreenNum] = useState('');
  const [numpadTimeout, setNumpadTimeout] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [favorites, setFavorites] = useState(readFavorites);
  const bannerTimer = useRef(null);

  const currentChannel = channels[channelIndex] || channels[0];

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Track HTML5 Fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    sounds.playClick();
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const el = document.documentElement;
      (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen || (() => {}))
        .call(el)
        .catch(() => {});
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen || (() => {}))
        .call(document)
        .catch(() => {});
    }
  }, []);

  // Show OSD banner briefly
  const showBannerBriefly = useCallback(() => {
    if (isGuideOpen) return;
    setShowBanner(true);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setShowBanner(false), BANNER_TIMEOUT);
  }, [isGuideOpen]);

  // Switch channel
  const switchToChannel = useCallback((index) => {
    const safeIdx = ((index % channels.length) + channels.length) % channels.length;
    sounds.playChannelSwitch();
    setChannelIndex(safeIdx);
    if (!isGuideOpen) showBannerBriefly();
  }, [channels.length, isGuideOpen, showBannerBriefly]);

  const channelUp   = useCallback(() => switchToChannel(channelIndex + 1), [channelIndex, switchToChannel]);
  const channelDown = useCallback(() => switchToChannel(channelIndex - 1), [channelIndex, switchToChannel]);

  const volumeUp = useCallback(() => {
    setIsMuted(false);
    setVolume(v => { const nv = Math.min(100, v + VOLUME_STEP); sounds.playVolumeChirp(400 + nv * 4); return nv; });
  }, []);

  const volumeDown = useCallback(() => {
    setVolume(v => { const nv = Math.max(0, v - VOLUME_STEP); sounds.playVolumeChirp(300 + nv * 4); return nv; });
  }, []);

  const toggleMute = useCallback(() => { sounds.playClick(); setIsMuted(m => !m); }, []);

  const toggleGuide = useCallback(() => {
    sounds.playGuideSound(!isGuideOpen);
    setIsGuideOpen(g => !g);
    if (isGuideOpen) showBannerBriefly();
  }, [isGuideOpen, showBannerBriefly]);

  // Favorites management
  const toggleFavorite = useCallback((channelNumber) => {
    setFavorites(prev => {
      const next = prev.includes(channelNumber)
        ? prev.filter(n => n !== channelNumber)
        : [...prev, channelNumber];
      writeFavorites(next);
      return next;
    });
  }, []);

  // Country channel loader
  const handleSelectCountry = useCallback(async (code, name, flag) => {
    sounds.playClick();
    if (!code) {
      setActiveCountry(null);
      setActiveCountryName('Global Lineup');
      setActiveCountryFlag('🌐');
      setChannels(DEFAULT_CHANNELS);
      setChannelIndex(0);
      sounds.playGuideSound(true);
      return;
    }
    setIsLoadingCountry(true);
    setActiveCountry(code);
    setActiveCountryName(name);
    setActiveCountryFlag(flag);
    try {
      const countryChs = await loadCountryChannels(code, 300);
      if (countryChs && countryChs.length > 0) {
        setChannels(countryChs);
        setChannelIndex(0);
        sounds.playGuideSound(true);
      }
    } catch (err) {
      console.warn('Failed to load country channels:', err);
    } finally {
      setIsLoadingCountry(false);
    }
  }, []);

  // Global keyboard shortcuts (non-guide keys)
  useEffect(() => {
    const handleKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      // Guide-open keys are handled in LegendGuide; handle TV-mode + modal keys here
      if (isGuideOpen) return;

      switch (e.key) {
        case 'PageUp':  e.preventDefault(); channelUp(); break;
        case 'PageDown': e.preventDefault(); channelDown(); break;
        case 'ArrowUp':   e.preventDefault(); channelUp(); break;
        case 'ArrowDown': e.preventDefault(); channelDown(); break;
        case 'ArrowRight': volumeUp(); break;
        case 'ArrowLeft':  volumeDown(); break;
        case 'f': case 'F': e.preventDefault(); toggleFullscreen(); break;
        case 'm': case 'M': toggleMute(); break;
        case 'g': case 'G': e.preventDefault(); toggleGuide(); break;
        case 'c': case 'C': setShowCountryModal(s => !s); break;
        case 'i': case 'I': setShowBanner(b => !b); break;
        case 'r': case 'R': setShowRemote(r => !r); break;
        case 'Escape':
          if (showCountryModal) setShowCountryModal(false);
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
              const target = parseInt(newNum, 10);
              const idx = channels.findIndex(c => c.number === target);
              if (idx !== -1) switchToChannel(idx);
              setOnScreenNum('');
            }, 1200);
            setNumpadTimeout(t);
          }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isGuideOpen, showApiBrowser, showCountryModal, channelUp, channelDown, volumeUp, volumeDown,
      toggleMute, toggleGuide, toggleFullscreen, onScreenNum, numpadTimeout, channels, switchToChannel]);

  // Also handle Guide-toggle key globally even when guide is open (for Escape/G)
  useEffect(() => {
    if (isGuideOpen) return; // handled inside LegendGuide
    // already handled above
  }, [isGuideOpen]);

  // Load from IPTV-org API
  const handleApiLoad = useCallback((apiChannels) => {
    const numbered = apiChannels.map((ch, i) => ({ ...ch, number: i + 1 }));
    setChannels(numbered);
    setChannelIndex(0);
    setActiveCountry('API');
    setActiveCountryName('IPTV-org Search');
    setActiveCountryFlag('🌐');
    sounds.playGuideSound(true);
  }, []);

  /* ── Dock items ───────────────────────────────────────── */
  const dockItems = [
    {
      icon: <Tv size={22} />,
      label: isGuideOpen ? 'Close Guide (G)' : 'Open Guide (G)',
      active: isGuideOpen,
      onClick: toggleGuide,
    },
    { icon: <ChevronDown size={22} />, label: 'Prev Channel', onClick: channelDown },
    { icon: <ChevronUp size={22} />,   label: 'Next Channel', onClick: channelUp },
    { separator: true },
    {
      icon: <span style={{ fontSize: '20px', lineHeight: 1 }}>{activeCountryFlag || '🌍'}</span>,
      label: `${activeCountryName} (${activeCountry || 'ALL'})`,
      onClick: () => setShowCountryModal(true),
      menu: [
        { label: '🌍 Browse All Countries...', onClick: () => setShowCountryModal(true) },
        { separator: true },
        { label: '🌐 Default Lineup',    onClick: () => handleSelectCountry(null, 'Global Lineup', '🌐') },
        { label: '🇺🇸 United States',   onClick: () => handleSelectCountry('US', 'United States', '🇺🇸') },
        { label: '🇬🇧 United Kingdom',  onClick: () => handleSelectCountry('UK', 'United Kingdom', '🇬🇧') },
        { label: '🇨🇦 Canada',          onClick: () => handleSelectCountry('CA', 'Canada', '🇨🇦') },
        { label: '🇩🇪 Germany',         onClick: () => handleSelectCountry('DE', 'Germany', '🇩🇪') },
        { label: '🇫🇷 France',          onClick: () => handleSelectCountry('FR', 'France', '🇫🇷') },
        { label: '🇯🇵 Japan',           onClick: () => handleSelectCountry('JP', 'Japan', '🇯🇵') },
        { label: '🇦🇺 Australia',       onClick: () => handleSelectCountry('AU', 'Australia', '🇦🇺') },
      ],
    },
    {
      icon: isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />,
      label: isMuted ? 'Unmute (M)' : `Vol ${volume}%`,
      onClick: toggleMute,
      menu: [
        { label: isMuted ? 'Unmute (M)' : 'Mute (M)', onClick: toggleMute },
        { separator: true },
        { label: 'Volume Up',   onClick: volumeUp },
        { label: 'Volume Down', onClick: volumeDown },
        { label: '100%',        onClick: () => setVolume(100) },
        { label: '50%',         onClick: () => setVolume(50) },
      ],
    },
    {
      icon: isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />,
      label: isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)',
      active: isFullscreen,
      onClick: toggleFullscreen,
    },
    {
      icon: <Star size={22} />,
      label: `Favorites (${favorites.length})`,
      onClick: () => { setIsGuideOpen(true); },
    },
    {
      icon: <Globe size={22} />,
      label: 'IPTV-org API',
      onClick: () => setShowApiBrowser(true),
    },
    {
      icon: <Gamepad2 size={22} />,
      label: 'Remote (R)',
      active: showRemote,
      onClick: () => setShowRemote(r => !r),
    },
  ];

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="xfinity-app-root">

      {/* Video always fills the entire background */}
      <div className="legend-tv-bg">
        <VideoPlayer channel={currentChannel} volume={volume} isMuted={isMuted} />
      </div>

      {/* Guide overlay — rendered above the video */}
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
        />
      )}

      {/* TV mode overlay — hover controls + OSD banner */}
      {!isGuideOpen && (
        <div
          className="legend-tv-overlay"
          onClick={showBannerBriefly}
          onDoubleClick={toggleFullscreen}
        >
          {/* Hover-reveal top bar */}
          <div className="fullscreen-top-bar">
            <div className="top-brand">
              <span className="brand-legend">LEGEND<span className="brand-er"> ER</span> TV</span>
              <span className="brand-channel-badge">
                CH {currentChannel?.number} • {currentChannel?.callsign || currentChannel?.name}
              </span>
            </div>
            <div className="top-actions">
              <button className="top-btn" onClick={e => { e.stopPropagation(); setShowCountryModal(true); }}>
                {activeCountryFlag} Country
              </button>
              <button className="top-btn" onClick={e => { e.stopPropagation(); toggleGuide(); }}>
                Guide (G)
              </button>
              <button className="top-btn" onClick={e => { e.stopPropagation(); toggleFullscreen(); }}>
                {isFullscreen ? 'Exit ⛶' : 'Fullscreen ⛶'}
              </button>
              <button className="top-btn" onClick={e => { e.stopPropagation(); setShowApiBrowser(true); }}>
                IPTV-org
              </button>
              <button className="top-btn" onClick={e => { e.stopPropagation(); setShowRemote(r => !r); }}>
                Remote
              </button>
            </div>
          </div>

          {/* OSD channel banner */}
          <ChannelBanner
            channel={currentChannel}
            visible={showBanner}
            onOpenGuide={toggleGuide}
          />
        </div>
      )}

      {/* Country loading toast */}
      {isLoadingCountry && (
        <div className="fetch-loading">
          <div className="spinner" />
          <span>Loading {activeCountryName} from IPTV-org…</span>
        </div>
      )}

      {/* Dock */}
      <Dock
        items={dockItems}
        position="bottom"
        theme="dark"
        baseItemSize={46}
        magnification={66}
        distance={160}
        panelHeight={62}
        gap={10}
        roundness={0.6}
        autoHide={false}
        tiles={true}
        showLabels={true}
        showIndicators={true}
        showBadges={false}
        badgeColor="#3b82f6"
        accentColor="#3b82f6"
        className="legend-tv-dock"
      />

      {/* Channel number HUD */}
      {onScreenNum && (
        <div className="xfinity-digit-hud">
          <span className="digit-prefix">CH</span>
          <span className="digit-val">{onScreenNum}</span>
        </div>
      )}

      {/* Floating Remote */}
      {showRemote && (
        <div className="floating-remote-wrap">
          <div className="remote-close-bar">
            <span>LEGEND ER TV REMOTE</span>
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
