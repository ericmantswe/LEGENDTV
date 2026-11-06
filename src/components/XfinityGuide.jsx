import { useState, useEffect, useRef, useCallback } from 'react';
import VideoPlayer from './VideoPlayer.jsx';
import { getXfinityTimeSlots, getVisibleGridPrograms, formatTimeRange } from '../utils/epgGenerator.js';
import { sounds } from '../utils/audioFX.js';

export default function XfinityGuide({
  channels,
  currentChannel,
  onSelectChannel,
  onCloseGuide,
  volume,
  isMuted,
  onOpenApiBrowser,
  isFullscreen,
  onToggleFullscreen,
  activeCountry,
  activeCountryName,
  activeCountryFlag,
  onOpenCountryModal,
  onQuickCountrySelect,
}) {
  const [timeSlots, setTimeSlots] = useState(() => getXfinityTimeSlots(new Date(), 5));
  const [selectedChannelIdx, setSelectedChannelIdx] = useState(() => {
    const idx = channels.findIndex(c => c.number === currentChannel?.number);
    return idx !== -1 ? idx : 0;
  });
  const [selectedProgIdx, setSelectedProgIdx] = useState(0);
  const [programsMap, setProgramsMap] = useState({});
  const gridContainerRef = useRef(null);

  // Generate grid programs for visible time slots
  useEffect(() => {
    const map = {};
    channels.forEach(ch => {
      map[ch.number] = getVisibleGridPrograms(ch, timeSlots);
    });
    setProgramsMap(map);
  }, [channels, timeSlots]);

  // Update time slots every 10 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSlots(getXfinityTimeSlots(new Date(), 5));
    }, 600000);
    return () => clearInterval(timer);
  }, []);

  const focusedChannel = channels[selectedChannelIdx] || channels[0];
  const focusedChannelPrograms = programsMap[focusedChannel?.number] || [];
  const focusedProg = focusedChannelPrograms[selectedProgIdx] || focusedChannelPrograms[0];

  // Handle keyboard navigation inside the Xfinity grid
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          sounds.playClick();
          setSelectedChannelIdx(prev => {
            const nextIdx = Math.max(0, prev - 1);
            return nextIdx;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          sounds.playClick();
          setSelectedChannelIdx(prev => {
            const nextIdx = Math.min(channels.length - 1, prev + 1);
            return nextIdx;
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          sounds.playClick();
          setSelectedProgIdx(prev => {
            const maxIdx = Math.max(0, (programsMap[focusedChannel?.number]?.length || 1) - 1);
            return Math.min(maxIdx, prev + 1);
          });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          sounds.playClick();
          setSelectedProgIdx(prev => Math.max(0, prev - 1));
          break;
        case 'Enter':
          e.preventDefault();
          sounds.playChannelSwitch();
          if (focusedChannel) {
            if (focusedChannel.number === currentChannel?.number) {
              // Pressing enter on already-tuned channel launches Full Screen TV!
              onCloseGuide();
            } else {
              onSelectChannel(focusedChannel);
            }
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          onToggleFullscreen();
          break;
        case 'Escape':
        case 'g':
        case 'G':
          e.preventDefault();
          sounds.playGuideSound(false);
          onCloseGuide();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [channels, focusedChannel, programsMap, onSelectChannel, onCloseGuide]);

  // Click handler on a program cell
  const handleCellClick = (channelIdx, progIdx, ch) => {
    setSelectedChannelIdx(channelIdx);
    setSelectedProgIdx(progIdx);
    sounds.playChannelSwitch();
    onSelectChannel(ch);
  };

  return (
    <div className="xfinity-guide-container">
      {/* Top Header matching Xfinity Guide photo */}
      <div className="xfinity-header">
        {/* Left: LEGEND TV branding + Guide title + Program details */}
        <div className="xfinity-header-left">
          <div className="xfinity-brand-row">
            <span className="xfinity-logo-text legend-logo-text">LEGEND TV</span>
            <span className="xfinity-brand-divider">|</span>
            <span className="xfinity-guide-title">Guide</span>
            <div className="xfinity-header-actions">
              {/* Country Selector Button */}
              <button
                className="xfinity-action-btn action-country-btn"
                onClick={onOpenCountryModal}
                title="Select TV Country Lineup (USA, UK, Canada, France, Japan...)"
              >
                {activeCountryFlag || '🌐'} {activeCountryName || 'Countries'} ({channels.length}) ▾
              </button>

              <button
                className="xfinity-action-btn action-watch-tv"
                onClick={onCloseGuide}
                title="Switch to Full Screen TV View (Esc)"
              >
                ▶ Watch Full Screen TV
              </button>
              <button
                className="xfinity-action-btn action-fullscreen"
                onClick={onToggleFullscreen}
                title="Toggle Browser Maximize Fullscreen (F)"
              >
                {isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Maximize'}
              </button>
              <button
                className="xfinity-action-btn"
                onClick={onOpenApiBrowser}
                title="Browse 15,000+ live IPTV-org streams"
              >
                🌐 IPTV-org API
              </button>
            </div>
          </div>

          {/* Quick Popular Country Pills Row */}
          <div className="xfinity-country-pills-row">
            <span className="pills-label">COUNTRY:</span>
            <button
              className={`country-pill ${!activeCountry ? 'country-pill-active' : ''}`}
              onClick={() => onQuickCountrySelect(null, 'LEGEND TV Curated', '🌐')}
            >
              🌐 Default
            </button>
            <button
              className={`country-pill ${activeCountry === 'US' ? 'country-pill-active' : ''}`}
              onClick={() => onQuickCountrySelect('US', 'United States', '🇺🇸')}
            >
              🇺🇸 USA
            </button>
            <button
              className={`country-pill ${activeCountry === 'UK' ? 'country-pill-active' : ''}`}
              onClick={() => onQuickCountrySelect('UK', 'United Kingdom', '🇬🇧')}
            >
              🇬🇧 UK
            </button>
            <button
              className={`country-pill ${activeCountry === 'CA' ? 'country-pill-active' : ''}`}
              onClick={() => onQuickCountrySelect('CA', 'Canada', '🇨🇦')}
            >
              🇨🇦 Canada
            </button>
            <button
              className={`country-pill ${activeCountry === 'DE' ? 'country-pill-active' : ''}`}
              onClick={() => onQuickCountrySelect('DE', 'Germany', '🇩🇪')}
            >
              🇩🇪 Germany
            </button>
            <button
              className={`country-pill ${activeCountry === 'FR' ? 'country-pill-active' : ''}`}
              onClick={() => onQuickCountrySelect('FR', 'France', '🇫🇷')}
            >
              🇫🇷 France
            </button>
            <button
              className={`country-pill ${activeCountry === 'ES' ? 'country-pill-active' : ''}`}
              onClick={() => onQuickCountrySelect('ES', 'Spain', '🇪🇸')}
            >
              🇪🇸 Spain
            </button>
            <button
              className={`country-pill ${activeCountry === 'IT' ? 'country-pill-active' : ''}`}
              onClick={() => onQuickCountrySelect('IT', 'Italy', '🇮🇹')}
            >
              🇮🇹 Italy
            </button>
            <button
              className={`country-pill ${activeCountry === 'JP' ? 'country-pill-active' : ''}`}
              onClick={() => onQuickCountrySelect('JP', 'Japan', '🇯🇵')}
            >
              🇯🇵 Japan
            </button>
            <button
              className={`country-pill ${activeCountry === 'AU' ? 'country-pill-active' : ''}`}
              onClick={() => onQuickCountrySelect('AU', 'Australia', '🇦🇺')}
            >
              🇦🇺 Australia
            </button>
            <button
              className="country-pill country-pill-more"
              onClick={onOpenCountryModal}
            >
              🌍 More Countries...
            </button>
          </div>

          {/* Focused show synopsis panel */}
          <div className="xfinity-synopsis-panel">
            <div className="xfinity-synopsis-title">
              {focusedProg?.title || focusedChannel?.name}
            </div>
            <div className="xfinity-synopsis-meta">
              {focusedProg && (
                <>
                  <span className="xfinity-meta-time">
                    {formatTimeRange(focusedProg.startTime, focusedProg.endTime)}
                  </span>
                  <span className="xfinity-meta-bullet">•</span>
                  <span className="xfinity-meta-rating">{focusedProg.rating || 'TV-PG'}</span>
                  <span className="xfinity-meta-bullet">•</span>
                  <span className="xfinity-meta-category">{focusedChannel?.category}</span>
                  <span className="xfinity-meta-bullet">•</span>
                  <span className="xfinity-meta-res">{focusedChannel?.resolution || 'HD'}</span>
                </>
              )}
            </div>
            <div className="xfinity-synopsis-desc">
              {focusedProg?.description || focusedChannel?.description}
            </div>
          </div>
        </div>

        {/* Right: Top-right Live Picture-in-Picture (PiP) window matching the photo */}
        <div
          className="xfinity-pip-box"
          onClick={onCloseGuide}
          title="Click to watch full screen"
        >
          <VideoPlayer
            channel={currentChannel}
            volume={volume}
            isMuted={isMuted}
          />
          <div className="xfinity-pip-badge">LIVE • {currentChannel?.callsign || currentChannel?.name}</div>
          <div className="xfinity-pip-hover-hint">Click for Fullscreen</div>
        </div>
      </div>

      {/* Grid Timeline Header */}
      <div className="xfinity-grid-header">
        <div className="xfinity-channel-col-header">
          {/* Spacer for channel logo/number column */}
        </div>
        <div className="xfinity-time-slots-row">
          {timeSlots.map((slot, i) => (
            <div key={i} className="xfinity-time-slot">
              {slot.label}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable Channel & Program Grid */}
      <div className="xfinity-grid-body" ref={gridContainerRef}>
        {channels.map((ch, chIdx) => {
          const isChannelSelected = chIdx === selectedChannelIdx;
          const progs = programsMap[ch.number] || [];

          return (
            <div
              key={ch.number || chIdx}
              className={`xfinity-channel-row ${isChannelSelected ? 'row-selected' : ''}`}
            >
              {/* Channel Header (Logo + Number + Callsign stacked on right) */}
              <div
                className={`xfinity-channel-cell ${isChannelSelected ? 'channel-cell-active' : ''}`}
                onClick={() => {
                  setSelectedChannelIdx(chIdx);
                  onSelectChannel(ch);
                }}
              >
                <div className="xfinity-ch-logo-wrap">
                  {ch.logo ? (
                    <img
                      src={ch.logo}
                      alt={ch.name}
                      className="xfinity-ch-logo"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="xfinity-ch-fallback-logo">
                      {ch.callsign ? ch.callsign.slice(0, 3) : ch.name.slice(0, 3)}
                    </div>
                  )}
                </div>
                <div className="xfinity-ch-labels">
                  <div className="xfinity-ch-num">{ch.number}</div>
                  <div className="xfinity-ch-callsign">{ch.callsign || ch.name.slice(0, 5).toUpperCase()}</div>
                </div>
              </div>

              {/* Program blocks spanning across time slots */}
              <div className="xfinity-programs-track">
                {progs.length > 0 ? (
                  progs.map((prog, pIdx) => {
                    const isCellFocused = isChannelSelected && pIdx === selectedProgIdx;
                    return (
                      <div
                        key={prog.id || pIdx}
                        className={`xfinity-program-block ${isCellFocused ? 'xfinity-cell-focused' : ''}`}
                        style={{ flex: prog.span }}
                        onClick={() => handleCellClick(chIdx, pIdx, ch)}
                        title={`${prog.title} (${formatTimeRange(prog.startTime, prog.endTime)})`}
                      >
                        <span className="xfinity-program-title">{prog.title}</span>
                      </div>
                    );
                  })
                ) : (
                  <div
                    className="xfinity-program-block"
                    style={{ flex: 5 }}
                    onClick={() => handleCellClick(chIdx, 0, ch)}
                  >
                    <span className="xfinity-program-title">{ch.name} Programming</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guide Footer Navigation Bar */}
      <div className="xfinity-guide-footer">
        <div className="xfinity-footer-hints">
          <span><kbd className="xf-kbd">▲▼</kbd> Channel</span>
          <span><kbd className="xf-kbd">◄►</kbd> Time</span>
          <span><kbd className="xf-kbd">ENTER</kbd> Tune / Watch</span>
          <span><kbd className="xf-kbd">ESC</kbd> TV Mode</span>
          <span><kbd className="xf-kbd">F</kbd> Maximize</span>
        </div>
        <div className="xfinity-footer-status">
          CH {currentChannel?.number} • {currentChannel?.name}
        </div>
      </div>
    </div>
  );
}

