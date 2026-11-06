import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getCurrentAndNextProgram, formatTimeRange } from '../utils/epgGenerator.js';
import { sounds } from '../utils/audioFX.js';

const NAV_ITEMS = [
  { id: 'live',      label: 'LIVE TV' },
  { id: 'favorites', label: 'FAVORITES' },
  { id: 'search',    label: 'SEARCH' },
  { id: 'countries', label: 'COUNTRIES' },
  { id: 'api',       label: 'IPTV-ORG' },
  { id: 'remote',    label: 'REMOTE' },
];

function formatClock(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/* ─── Program Details Panel ─────────────────────────────────────── */
function ProgramDetails({ channel, isFav, onToggleFav, onWatch, isCurrent }) {
  const [epg, setEpg] = useState(null);

  useEffect(() => {
    if (!channel) return;
    setEpg(getCurrentAndNextProgram(channel, new Date()));
    const t = setInterval(() => setEpg(getCurrentAndNextProgram(channel, new Date())), 30000);
    return () => clearInterval(t);
  }, [channel?.number]);

  if (!channel) return null;
  const { current, next } = epg || {};

  return (
    <div className="lg-prog-details">
      {/* Channel header */}
      <div className="lg-prog-header">
        <div className="lg-prog-ch-info">
          <div className="lg-prog-ch-logo-wrap">
            {channel.logo ? (
              <img
                src={channel.logo}
                alt={channel.name}
                className="lg-prog-ch-logo"
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <span className="lg-prog-ch-fallback">
                {(channel.callsign || channel.name).slice(0, 4).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="lg-prog-ch-num">CH {String(channel.number).padStart(3, '0')}</div>
            <div className="lg-prog-ch-name">{channel.name}</div>
            {channel.country && (
              <div className="lg-prog-ch-country">{channel.country}</div>
            )}
          </div>
        </div>

        <div className="lg-prog-actions">
          <button
            className={`lg-fav-action ${isFav ? 'lg-fav-active' : ''}`}
            onClick={() => { onToggleFav(channel.number); sounds.playClick(); }}
            title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            {isFav ? '★ Saved' : '☆ Favorite'}
          </button>
          <button className="lg-watch-btn" onClick={onWatch}>
            ▶ {isCurrent ? 'Watch Live' : 'Tune In'}
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="lg-prog-divider" />

      {/* Program list */}
      <div className="lg-prog-list">
        {current && (
          <div className="lg-prog-item">
            <div className="lg-prog-status on-now">On Now</div>
            <div className="lg-prog-title">{current.title}</div>
            {current.description && (
              <div className="lg-prog-desc">{current.description}</div>
            )}
            <div className="lg-prog-time">{formatTimeRange(current.startTime, current.endTime)}</div>
          </div>
        )}
        {next && (
          <div className="lg-prog-item">
            <div className="lg-prog-status on-next">On Next</div>
            <div className="lg-prog-title">{next.title}</div>
            {next.description && (
              <div className="lg-prog-desc">{next.description}</div>
            )}
            <div className="lg-prog-time">{formatTimeRange(next.startTime, next.endTime)}</div>
          </div>
        )}
        {!current && !next && (
          <div className="lg-prog-no-info">
            <p>Live stream • No EPG data</p>
            <p>Tune in to watch live</p>
          </div>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="lg-kbd-hints">
        <span><kbd>↑↓</kbd> Navigate</span>
        <span><kbd>Enter</kbd> Watch</span>
        <span><kbd>F</kbd> Favorite</span>
        <span><kbd>G / Esc</kbd> Close Guide</span>
      </div>
    </div>
  );
}

/* ─── Main LegendGuide Component ────────────────────────────────── */
export default function LegendGuide({
  channels,
  currentChannel,
  onSelectChannel,
  onCloseGuide,
  favorites = [],
  onToggleFavorite,
  onOpenCountryModal,
  onOpenApiBrowser,
  onShowRemote,
  activeCountry,
  activeCountryName,
  activeCountryFlag,
  isFullscreen,
  onToggleFullscreen,
}) {
  const [activeTab, setActiveTab] = useState('live');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(() => {
    const idx = channels.findIndex(c => c.number === currentChannel?.number);
    return idx !== -1 ? idx : 0;
  });
  const [clock, setClock] = useState(new Date());
  const listRef = useRef(null);
  const selectedItemRef = useRef(null);
  const searchInputRef = useRef(null);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Focus search input when switching to search tab
  useEffect(() => {
    if (activeTab === 'search') {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [activeTab]);

  // Filter channels based on tab + search
  const displayChannels = useMemo(() => {
    let chs = channels;
    if (activeTab === 'favorites') {
      chs = channels.filter(ch => favorites.includes(ch.number));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      chs = chs.filter(ch =>
        ch.name.toLowerCase().includes(q) ||
        (ch.callsign || '').toLowerCase().includes(q) ||
        String(ch.number).includes(q) ||
        (ch.country || '').toLowerCase().includes(q)
      );
    }
    return chs;
  }, [channels, activeTab, searchQuery, favorites]);

  const selectedChannel = displayChannels[Math.min(selectedIdx, displayChannels.length - 1)] || null;

  // Scroll selected item into view
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIdx, displayChannels.length]);

  // Reset selectedIdx when channels change
  useEffect(() => {
    setSelectedIdx(0);
  }, [displayChannels.length, activeTab]);

  const handleTabChange = useCallback((tabId) => {
    sounds.playClick();
    if (tabId === 'countries') { onOpenCountryModal(); return; }
    if (tabId === 'api')       { onOpenApiBrowser(); return; }
    if (tabId === 'remote')    { onShowRemote?.(); return; }
    setActiveTab(tabId);
    setSelectedIdx(0);
    if (tabId !== 'search') setSearchQuery('');
  }, [onOpenCountryModal, onOpenApiBrowser, onShowRemote]);

  const handleSelectAndWatch = useCallback((ch) => {
    sounds.playChannelSwitch();
    onSelectChannel(ch);
    onCloseGuide();
  }, [onSelectChannel, onCloseGuide]);

  const handleSelectInList = useCallback((ch, idx) => {
    setSelectedIdx(idx);
    sounds.playClick();
    onSelectChannel(ch);
  }, [onSelectChannel]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      const inInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);

      switch (e.key) {
        case 'ArrowUp':
          if (inInput) return;
          e.preventDefault();
          sounds.playClick();
          setSelectedIdx(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          if (inInput) return;
          e.preventDefault();
          sounds.playClick();
          setSelectedIdx(prev => Math.min(displayChannels.length - 1, prev + 1));
          break;
        case 'Enter':
          if (inInput) return;
          e.preventDefault();
          if (selectedChannel) handleSelectAndWatch(selectedChannel);
          break;
        case 'f':
        case 'F':
          if (inInput) return;
          if (selectedChannel) {
            onToggleFavorite(selectedChannel.number);
            sounds.playClick();
          }
          break;
        case 'Escape':
          e.preventDefault();
          sounds.playGuideSound(false);
          onCloseGuide();
          break;
        case 'g':
        case 'G':
          if (inInput) return;
          e.preventDefault();
          sounds.playGuideSound(false);
          onCloseGuide();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [displayChannels, selectedChannel, handleSelectAndWatch, onCloseGuide, onToggleFavorite]);

  return (
    <div className="legend-guide-wrap">
      {/* Guide panels */}
      <div className="legend-guide-panels">

        {/* ── Left Sidebar ──────────────────────────────── */}
        <div className="lg-sidebar">
          <div className="lg-sidebar-brand">
            <span className="lg-brand-legend">LEGEND</span>
            <span className="lg-brand-er"> ER</span>
            <span className="lg-brand-tv"> TV</span>
          </div>

          <nav className="lg-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`lg-nav-item ${activeTab === item.id ? 'lg-nav-active' : ''}`}
                onClick={() => handleTabChange(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Active country indicator */}
          <div className="lg-sidebar-footer">
            <button
              className="lg-country-pill"
              onClick={onOpenCountryModal}
              title="Change country lineup"
            >
              <span>{activeCountryFlag || '🌐'}</span>
              <span className="lg-country-name">{activeCountryName || 'Global'}</span>
            </button>
            <button
              className="lg-fullscreen-btn"
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? '⛶ Exit' : '⛶ Maximize'}
            </button>
          </div>
        </div>

        {/* ── Channel List ───────────────────────────────── */}
        <div className="lg-channel-col">
          {/* Search bar (always visible in search tab) */}
          {activeTab === 'search' && (
            <div className="lg-search-bar">
              <input
                ref={searchInputRef}
                type="text"
                className="lg-search-input"
                placeholder="Search channels, numbers…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedIdx(0); }}
                autoFocus
              />
              {searchQuery && (
                <button className="lg-search-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>
          )}

          {/* Channel count badge */}
          <div className="lg-ch-count">
            {displayChannels.length} channel{displayChannels.length !== 1 ? 's' : ''}
            {activeTab === 'favorites' && favorites.length === 0 && (
              <span className="lg-fav-hint"> • Press F to favorite</span>
            )}
          </div>

          {/* Channel scroll list */}
          <div className="lg-ch-list" ref={listRef}>
            {displayChannels.length === 0 && (
              <div className="lg-empty-state">
                {activeTab === 'favorites' ? (
                  <>
                    <span>⭐</span>
                    <p>No favorites yet</p>
                    <p>Browse channels and press F</p>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <p>No channels found</p>
                    <p>Try a different search</p>
                  </>
                )}
              </div>
            )}

            {displayChannels.map((ch, idx) => {
              const isSelected = idx === selectedIdx;
              const isCurrent = ch.number === currentChannel?.number;
              const isFav = favorites.includes(ch.number);
              return (
                <div
                  key={ch.number}
                  ref={isSelected ? selectedItemRef : null}
                  className={[
                    'lg-ch-item',
                    isSelected ? 'lg-ch-selected' : '',
                    isCurrent ? 'lg-ch-current' : '',
                  ].join(' ')}
                  onClick={() => handleSelectInList(ch, idx)}
                  onDoubleClick={() => handleSelectAndWatch(ch)}
                >
                  <span className="lg-ch-num">{String(ch.number).padStart(3, '0')}</span>

                  <div className="lg-ch-logo-wrap">
                    {ch.logo ? (
                      <img
                        src={ch.logo}
                        alt={ch.name}
                        className="lg-ch-logo"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="lg-ch-fallback">
                        {(ch.callsign || ch.name).slice(0, 5).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {isCurrent && <span className="lg-live-dot" title="Tuned" />}

                  <button
                    className={`lg-fav-btn ${isFav ? 'lg-fav-on' : ''}`}
                    onClick={e => { e.stopPropagation(); onToggleFavorite(ch.number); sounds.playClick(); }}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFav ? '★' : '☆'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Program Details ─────────────────────────────── */}
        <div className="lg-program-col">
          <ProgramDetails
            channel={selectedChannel}
            isFav={selectedChannel ? favorites.includes(selectedChannel.number) : false}
            onToggleFav={onToggleFavorite}
            onWatch={() => selectedChannel && handleSelectAndWatch(selectedChannel)}
            isCurrent={selectedChannel?.number === currentChannel?.number}
          />
        </div>
      </div>

      {/* Clock — top right, always visible */}
      <div className="lg-clock">{formatClock(clock)}</div>
    </div>
  );
}
