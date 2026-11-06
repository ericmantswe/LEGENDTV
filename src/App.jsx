import { useState, useEffect, useCallback, useRef } from 'react';
import VideoPlayer from './components/VideoPlayer.jsx';
import ChannelBanner from './components/ChannelBanner.jsx';
import XfinityGuide from './components/XfinityGuide.jsx';
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
  Layers,
} from 'lucide-react';
import { DEFAULT_CHANNELS } from './data/defaultChannels.js';
import { loadCountryChannels } from './utils/iptvApi.js';
import { sounds } from './utils/audioFX.js';
import './App.css';

const VOLUME_STEP = 10;
const BANNER_TIMEOUT = 4500;

export default function App() {
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [channelIndex, setChannelIndex] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(true); // Open directly into LEGEND TV Guide
  const [showBanner, setShowBanner] = useState(false);
  const [showRemote, setShowRemote] = useState(false);
  const [showApiBrowser, setShowApiBrowser] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [activeCountry, setActiveCountry] = useState(null); // null = default curated
  const [activeCountryName, setActiveCountryName] = useState('Curated Lineup');
  const [activeCountryFlag, setActiveCountryFlag] = useState('🌐');
  const [isLoadingCountry, setIsLoadingCountry] = useState(false);
  const [onScreenNum, setOnScreenNum] = useState('');
  const [numpadTimeout, setNumpadTimeout] = useState(null);
  const [clock, setClock] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
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

  // Robust HTML5 Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    sounds.playClick();
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }, []);

  // Show banner briefly in full screen mode
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
    if (!isGuideOpen) {
      showBannerBriefly();
    }
  }, [channels.length, isGuideOpen, showBannerBriefly]);

  const channelUp = useCallback(() => switchToChannel(channelIndex + 1), [channelIndex, switchToChannel]);
  const channelDown = useCallback(() => switchToChannel(channelIndex - 1), [channelIndex, switchToChannel]);

  const volumeUp = useCallback(() => {
    setIsMuted(false);
    setVolume(v => {
      const nv = Math.min(100, v + VOLUME_STEP);
      sounds.playVolumeChirp(400 + nv * 4);
      return nv;
    });
  }, []);

  const volumeDown = useCallback(() => {
    setVolume(v => {
      const nv = Math.max(0, v - VOLUME_STEP);
      sounds.playVolumeChirp(300 + nv * 4);
      return nv;
    });
  }, []);

  const toggleMute = useCallback(() => {
    sounds.playClick();
    setIsMuted(m => !m);
  }, []);

  const toggleGuide = useCallback(() => {
    sounds.playGuideSound(!isGuideOpen);
    setIsGuideOpen(g => !g);
    if (isGuideOpen) {
      showBannerBriefly();
    }
  }, [isGuideOpen, showBannerBriefly]);

  // Country channel loader
  const handleSelectCountry = useCallback(async (code, name, flag) => {
    sounds.playClick();
    if (!code) {
      // Reset to default channels
      setActiveCountry(null);
      setActiveCountryName('Curated Lineup');
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
      console.warn("Failed to load country channels:", err);
    } finally {
      setIsLoadingCountry(false);
    }
  }, []);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKey = (e) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      switch (e.key) {
        case 'PageUp':
          e.preventDefault();
          channelUp();
          break;
        case 'PageDown':
          e.preventDefault();
          channelDown();
          break;
        case 'ArrowUp':
          if (!isGuideOpen) { e.preventDefault(); channelUp(); }
          break;
        case 'ArrowDown':
          if (!isGuideOpen) { e.preventDefault(); channelDown(); }
          break;
        case 'ArrowRight':
          if (!isGuideOpen) { volumeUp(); }
          break;
        case 'ArrowLeft':
          if (!isGuideOpen) { volumeDown(); }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
        case 'g':
        case 'G':
          toggleGuide();
          break;
        case 'c':
        case 'C':
          setShowCountryModal(s => !s);
          break;
        case 'i':
        case 'I':
          if (!isGuideOpen) {
            setShowBanner(b => !b);
          } else {
            toggleGuide();
          }
          break;
        case 'r':
        case 'R':
          setShowRemote(r => !r);
          break;
        case 'Escape':
          if (showCountryModal) {
            setShowCountryModal(false);
          } else if (showApiBrowser) {
            setShowApiBrowser(false);
          } else if (isGuideOpen) {
            setIsGuideOpen(false);
            showBannerBriefly();
          }
          break;
        default:
          // Numeric channel jump (e.g. 1, 2, 10, 20)
          if (e.key >= '0' && e.key <= '9') {
            const newNum = onScreenNum + e.key;
            setOnScreenNum(newNum);
            sounds.playClick();
            if (numpadTimeout) clearTimeout(numpadTimeout);
            const t = setTimeout(() => {
              const target = parseInt(newNum, 10);
              const idx = channels.findIndex(c => c.number === target);
              if (idx !== -1) {
                switchToChannel(idx);
              }
              setOnScreenNum('');
            }, 1200);
            setNumpadTimeout(t);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [
    isGuideOpen,
    showApiBrowser,
    showCountryModal,
    channelUp,
    channelDown,
    volumeUp,
    volumeDown,
    toggleMute,
    toggleGuide,
    toggleFullscreen,
    onScreenNum,
    numpadTimeout,
    channels,
    switchToChannel,
    showBannerBriefly,
  ]);

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

  // React Bits <Dock /> Items configuration
  const dockItems = [
    {
      icon: <Tv size={22} />,
      label: isGuideOpen ? 'Close Guide' : 'TV Guide (G)',
      active: isGuideOpen,
      onClick: toggleGuide,
      menu: [
        { label: isGuideOpen ? 'Close Guide (Esc)' : 'Open Cable Guide (G)', onClick: toggleGuide },
        { separator: true },
        { label: 'Watch Fullscreen TV', onClick: () => setIsGuideOpen(false) },
      ]
    },
    {
      icon: <ChevronDown size={22} />,
      label: 'Prev Channel (▼)',
      onClick: channelDown,
    },
    {
      icon: <ChevronUp size={22} />,
      label: 'Next Channel (▲)',
      onClick: channelUp,
    },
    { separator: true },
    {
      icon: <span style={{ fontSize: '20px', lineHeight: 1 }}>{activeCountryFlag || '🌍'}</span>,
      label: `Country: ${activeCountryName} (${activeCountry || 'ALL'})`,
      badge: activeCountry || 'ALL',
      onClick: () => setShowCountryModal(true),
      menu: [
        { label: '🌍 Browse All Countries (200+)...', onClick: () => setShowCountryModal(true) },
        { separator: true },
        { label: '🌐 Default Curated Lineup', onClick: () => handleSelectCountry(null, 'Curated Lineup', '🌐') },
        { label: '🇺🇸 United States', onClick: () => handleSelectCountry('US', 'United States', '🇺🇸') },
        { label: '🇬🇧 United Kingdom', onClick: () => handleSelectCountry('UK', 'United Kingdom', '🇬🇧') },
        { label: '🇨🇦 Canada', onClick: () => handleSelectCountry('CA', 'Canada', '🇨🇦') },
        { label: '🇩🇪 Germany', onClick: () => handleSelectCountry('DE', 'Germany', '🇩🇪') },
        { label: '🇫🇷 France', onClick: () => handleSelectCountry('FR', 'France', '🇫🇷') },
        { label: '🇪🇸 Spain', onClick: () => handleSelectCountry('ES', 'Spain', '🇪🇸') },
        { label: '🇯🇵 Japan', onClick: () => handleSelectCountry('JP', 'Japan', '🇯🇵') },
        { label: '🇦🇺 Australia', onClick: () => handleSelectCountry('AU', 'Australia', '🇦🇺') },
      ]
    },
    {
      icon: isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />,
      label: isMuted ? 'Unmute (M)' : `Volume ${volume}%`,
      badge: isMuted ? 'OFF' : `${volume}%`,
      onClick: toggleMute,
      menu: [
        { label: isMuted ? 'Unmute Audio' : 'Mute Audio (M)', onClick: toggleMute },
        { separator: true },
        { label: 'Volume Up (+10%)', onClick: volumeUp },
        { label: 'Volume Down (-10%)', onClick: volumeDown },
        { label: '100% Maximum', onClick: () => setVolume(100) },
        { label: '50% Normal', onClick: () => setVolume(50) },
      ]
    },
    {
      icon: isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />,
      label: isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)',
      active: isFullscreen,
      onClick: toggleFullscreen,
      menu: [
        { label: isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (F)', onClick: toggleFullscreen },
        { label: isGuideOpen ? 'Watch Full Screen TV' : 'Open Cable Guide', onClick: toggleGuide }
      ]
    },
    {
      icon: <Globe size={22} />,
      label: 'IPTV-org API',
      badge: '15k',
      onClick: () => setShowApiBrowser(true),
      menu: [
        { label: 'Browse 15,000+ Channels', onClick: () => setShowApiBrowser(true) },
        { label: 'Filter by Country & Language', onClick: () => setShowApiBrowser(true) }
      ]
    },
    {
      icon: <Gamepad2 size={22} />,
      label: 'Remote (R)',
      active: showRemote,
      onClick: () => setShowRemote(r => !r),
    }
  ];

  return (
    <div className="xfinity-app-root">
      {/* GUIDE MODE (LEGEND TV Cable Guide) */}
      {isGuideOpen ? (
        <XfinityGuide
          channels={channels}
          currentChannel={currentChannel}
          onSelectChannel={(ch) => {
            const idx = channels.findIndex(c => c.number === ch.number);
            if (idx !== -1) {
              setChannelIndex(idx);
            }
          }}
          onCloseGuide={() => {
            setIsGuideOpen(false);
            showBannerBriefly();
          }}
          volume={volume}
          isMuted={isMuted}
          onOpenApiBrowser={() => setShowApiBrowser(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          activeCountry={activeCountry}
          activeCountryName={activeCountryName}
          activeCountryFlag={activeCountryFlag}
          onOpenCountryModal={() => setShowCountryModal(true)}
          onQuickCountrySelect={handleSelectCountry}
        />
      ) : (
        /* FULLSCREEN TV MODE */
        <div
          className="xfinity-fullscreen-tv"
          onClick={showBannerBriefly}
          onDoubleClick={toggleFullscreen}
        >
          <VideoPlayer
            channel={currentChannel}
            volume={volume}
            isMuted={isMuted}
          />

          {/* Floating Top Control Bar */}
          <div className="fullscreen-top-bar">
            <div className="top-brand">
              <span className="brand-legend">LEGEND TV</span>
              <span className="brand-channel-badge">
                CH {currentChannel?.number} • {currentChannel?.callsign || currentChannel?.name}
              </span>
              <button
                className="top-country-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCountryModal(true);
                }}
                title="Change Country Lineup (C)"
              >
                {activeCountryFlag} {activeCountry || 'GLOBAL'} ({channels.length}) ▾
              </button>
            </div>
            <div className="top-actions">
              <button
                className="top-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCountryModal(true);
                }}
                title="Change Country (C)"
              >
                🌍 Country
              </button>
              <button
                className="top-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleGuide();
                }}
                title="Open Guide (G)"
              >
                Guide (G)
              </button>
              <button
                className="top-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                title="Toggle Fullscreen (F)"
              >
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen (F)'}
              </button>
              <button
                className="top-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowApiBrowser(true);
                }}
                title="Browse IPTV-org channels"
              >
                IPTV-org
              </button>
              <button
                className="top-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRemote(r => !r);
                }}
                title="Toggle Remote (R)"
              >
                Remote
              </button>
            </div>
          </div>

          {/* On-Screen Display (OSD) Banner */}
          <ChannelBanner
            channel={currentChannel}
            visible={showBanner}
            onOpenGuide={toggleGuide}
          />
        </div>
      )}

      {/* Loading Country Toast */}
      {isLoadingCountry && (
        <div className="fetch-loading">
          <div className="spinner" />
          <span>Loading {activeCountryName} channels from IPTV-org...</span>
        </div>
      )}

      {/* React Bits <Dock /> Component: Floating at bottom */}
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
        showBadges={true}
        badgeColor="#ff453a"
        accentColor="#ffd000"
        className="legend-tv-dock"
      />

      {/* Direct Channel Number Overlay (e.g. typing "4") */}
      {onScreenNum && (
        <div className="xfinity-digit-hud">
          <span className="digit-prefix">CH</span>
          <span className="digit-val">{onScreenNum}</span>
        </div>
      )}

      {/* Floating Remote Control */}
      {showRemote && (
        <div className="floating-remote-wrap">
          <div className="remote-close-bar">
            <span>LEGEND TV REMOTE</span>
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

      {/* Full Country Lineup Modal */}
      {showCountryModal && (
        <CountryModal
          activeCountry={activeCountry}
          onSelectCountry={handleSelectCountry}
          onClose={() => setShowCountryModal(false)}
        />
      )}

      {/* IPTV-org API Channel Browser Modal */}
      {showApiBrowser && (
        <ApiBrowser
          onLoadChannels={handleApiLoad}
          onClose={() => setShowApiBrowser(false)}
        />
      )}
    </div>
  );
}
