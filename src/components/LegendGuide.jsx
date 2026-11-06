import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getCurrentAndNextProgram, formatTimeRange } from '../utils/epgGenerator.js';
import { getLiveCurrentAndNext, loadWeeklySchedule, getNetworkKeywords } from '../utils/epgService.js';
import WeekScheduleModal from './WeekScheduleModal.jsx';
import { sounds } from '../utils/audioFX.js';
import {
  Tv,
  Star,
  Search,
  Globe,
  Sliders,
  Settings,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './LegendGuide.css';

const ROW_H = 56;
const SEL_H = 112;

const NAV_ITEMS = [
  { id: 'settings',  label: 'SETTINGS',     icon: Settings },
  { id: 'search',    label: 'SEARCH',       icon: Search   },
  { id: 'live',      label: 'ALL CHANNELS', icon: Tv       },
  { id: 'favorites', label: 'FAVORITES',    icon: Star     },
  { id: 'countries', label: 'COUNTRIES',    icon: Globe    },
  { id: 'iptv',      label: 'IPTV-ORG',     icon: Sliders  },
];

function fmtClock(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

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
  activeCountryFlag,
  activeCountryName,
  captionsEnabled = true,
  onToggleCaptions,
}) {
  const [tab, setTab] = useState('live');
  const [query, setQuery] = useState('');
  const [liveEpg, setLiveEpg] = useState(null);
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [channelNowTitles, setChannelNowTitles] = useState({});
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('legend_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [selIdx, setSelIdx] = useState(() => {
    const i = channels.findIndex(c => c.number === currentChannel?.number);
    return i !== -1 ? i : 0;
  });

  const [clock, setClock] = useState(new Date());
  const searchRef = useRef(null);
  const selectedItemRef = useRef(null);
  const scrollContainerRef = useRef(null);

  /* Clock tick */
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Save sidebar state */
  const toggleSidebar = useCallback(() => {
    sounds.playClick();
    setIsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('legend_sidebar_collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  /* Auto-focus search */
  useEffect(() => {
    if (tab === 'search') setTimeout(() => searchRef.current?.focus(), 50);
  }, [tab]);

  /* Filtered channel list — ALL CHANNELS supported */
  const list = useMemo(() => {
    let chs = channels;
    if (tab === 'favorites') chs = channels.filter(c => favorites.includes(c.number));
    const q = query.trim().toLowerCase();
    if (q) {
      chs = chs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.callsign || '').toLowerCase().includes(q) ||
        String(c.number).includes(q)
      );
    }
    return chs;
  }, [channels, tab, query, favorites]);

  const safeIdx = Math.min(selIdx, Math.max(0, list.length - 1));
  const selectedChannel = list[safeIdx] || currentChannel || channels[0];

  /* Scroll selected item into view whenever selIdx changes */
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [safeIdx]);

  /* Tab change */
  const changeTab = useCallback((id) => {
    sounds.playClick();
    if (id === 'countries') { onOpenCountryModal(); return; }
    if (id === 'iptv')      { onOpenApiBrowser();   return; }
    if (id === 'settings')  { onShowRemote?.();     return; }
    setTab(id);
    setSelIdx(0);
    if (id !== 'search') setQuery('');
  }, [onOpenCountryModal, onOpenApiBrowser, onShowRemote]);

  /* Tune + close */
  const watchCh = useCallback((ch) => {
    if (!ch) return;
    sounds.playChannelSwitch();
    onSelectChannel(ch);
    onCloseGuide();
  }, [onSelectChannel, onCloseGuide]);

  /* Keyboard controls */
  useEffect(() => {
    const onKey = (e) => {
      const inp = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      switch (e.key) {
        case 'ArrowUp':
          if (inp) return;
          e.preventDefault();
          sounds.playClick();
          setSelIdx(p => Math.max(0, p - 1));
          break;
        case 'ArrowDown':
          if (inp) return;
          e.preventDefault();
          sounds.playClick();
          setSelIdx(p => Math.min(list.length - 1, p + 1));
          break;
        case 'PageUp':
          if (inp) return;
          e.preventDefault();
          sounds.playClick();
          setSelIdx(p => Math.max(0, p - 10));
          break;
        case 'PageDown':
          if (inp) return;
          e.preventDefault();
          sounds.playClick();
          setSelIdx(p => Math.min(list.length - 1, p + 10));
          break;
        case 'Enter':
          if (inp) return;
          e.preventDefault();
          if (selectedChannel) watchCh(selectedChannel);
          break;
        case 'f':
        case 'F':
          if (inp) return;
          if (selectedChannel) {
            onToggleFavorite(selectedChannel.number);
            sounds.playClick();
          }
          break;
        case 'c':
        case 'C':
          if (inp) return;
          e.preventDefault();
          onToggleCaptions?.();
          break;
        case 'w':
        case 'W':
          if (inp) return;
          e.preventDefault();
          sounds.playClick();
          setShowWeekModal(s => !s);
          break;
        case '[':
          if (inp) return;
          e.preventDefault();
          toggleSidebar();
          break;
        case 'Escape':
        case 'g':
        case 'G':
          if (inp && e.key !== 'Escape') return;
          e.preventDefault();
          sounds.playGuideSound(false);
          onCloseGuide();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [list, safeIdx, selectedChannel, watchCh, onCloseGuide, onToggleFavorite, toggleSidebar, onToggleCaptions]);

  /* ── Real Live Broadcast EPG for the selected channel ───── */
  useEffect(() => {
    let active = true;
    if (!selectedChannel) { setLiveEpg(null); return; }

    getLiveCurrentAndNext(selectedChannel, activeCountry || 'US', new Date())
      .then(data => {
        if (active) setLiveEpg(data);
      })
      .catch(() => {
        if (active) setLiveEpg(null);
      });

    return () => { active = false; };
  }, [selectedChannel, activeCountry]);

  /* ── Background loader for channel current show titles ─── */
  useEffect(() => {
    let active = true;
    loadWeeklySchedule(activeCountry || 'US').then(schedule => {
      if (!active || !schedule?.showsByNetwork) return;
      const nowMs = Date.now();
      const map = {};
      for (const ch of channels.slice(0, 80)) {
        const keywords = getNetworkKeywords(ch);
        for (const net in schedule.showsByNetwork) {
          const netLower = net.toLowerCase();
          if (keywords.some(k => netLower.includes(k) || k.includes(netLower))) {
            const shows = schedule.showsByNetwork[net];
            const cur = shows.find(s => nowMs >= s.startTime.getTime() && nowMs < s.endTime.getTime()) || shows[0];
            if (cur) {
              map[ch.number] = cur.title;
              break;
            }
          }
        }
      }
      setChannelNowTitles(map);
    });
    return () => { active = false; };
  }, [channels, activeCountry]);

  /* Combined EPG (live broadcast schedule or channel metadata) */
  const epg = liveEpg || getCurrentAndNextProgram(selectedChannel, new Date());

  const isCurrentChannelLive = selectedChannel?.number === currentChannel?.number;
  const isSelectedFav = selectedChannel ? favorites.includes(selectedChannel.number) : false;

  return (
    <div className="lg-wrap">

      {/* Search Input when SEARCH tab is selected */}
      {tab === 'search' && (
        <div className="lg-search-bar">
          <Search size={16} className="lg-search-icon" />
          <input
            ref={searchRef}
            className="lg-search-input"
            type="text"
            placeholder={`Search across all ${channels.length} channels…`}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelIdx(0); }}
          />
          {query && (
            <button className="lg-search-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>
      )}

      {/* ── Left Charcoal Grey Frosted Glass Section ────────── */}
      <div className={`lg-glass-left ${isCollapsed ? 'lg-collapsed' : ''}`}>

        {/* Collapsible Sidebar */}
        <nav className="lg-sidebar">
          {/* Header with Sidebar Collapse Toggle & Logo */}
          <div className="lg-sidebar-top">
            {!isCollapsed && (
              <img
                src="/Vibrant%20legendER%20TV%20Gradient%20Logo.png"
                alt="LEGEND ER TV"
                className="lg-sidebar-brand-img"
              />
            )}
            <button
              className="lg-collapse-btn"
              onClick={toggleSidebar}
              title={isCollapsed ? 'Expand sidebar ([)' : 'Collapse sidebar ([)'}
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Navigation Items */}
          <div className="lg-nav-list">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  className={`lg-nav-item ${isActive ? 'lg-nav-active' : ''}`}
                  onClick={() => changeTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={16} className="lg-nav-icon" />
                  {!isCollapsed && <span className="lg-nav-text">{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Country Lineup Indicator */}
          <button
            className="lg-country-btn"
            onClick={onOpenCountryModal}
            title={`Active: ${activeCountryName} (${channels.length} channels) — Click to switch`}
          >
            <span className="lg-country-flag">{activeCountryFlag || '🌐'}</span>
            {!isCollapsed && (
              <span className="lg-country-name">{activeCountryName || 'Global'}</span>
            )}
          </button>
        </nav>

        {/* ── Channel Column: Truly shows ALL channels (scrollable) ── */}
        <div className="lg-ch-column-wrap">
          {/* Header indicator showing channel count */}
          <div className="lg-ch-header-info">
            <span className="lg-ch-count-text">
              {tab === 'favorites' ? 'FAVORITES' : 'ALL CHANNELS'} ({list.length})
            </span>
          </div>

          <div className="lg-ch-column-scroll" ref={scrollContainerRef}>
            {list.length === 0 && (
              <div className="lg-empty-list">
                {tab === 'favorites' ? 'No favorites saved yet' : 'No channels found'}
              </div>
            )}

            {list.map((ch, i) => {
              const isSel  = i === safeIdx;
              const isFav  = favorites.includes(ch.number);
              const isLive = ch.number === currentChannel?.number;

              return (
                <div
                  key={ch.number}
                  ref={isSel ? selectedItemRef : null}
                  className={`lg-ch-row ${isSel ? 'lg-ch-selected' : ''}`}
                  style={{ height: isSel ? SEL_H : ROW_H }}
                  onClick={() => { setSelIdx(i); onSelectChannel(ch); }}
                  onDoubleClick={() => watchCh(ch)}
                >
                  {isSel ? (
                    /* ── Selected Channel Block: Solid Blue Square Block ── */
                    <>
                      <div className="lg-sel-header">
                        {isLive && <span className="lg-live-indicator" title="Currently Tuned" />}
                        <span className="lg-sel-number">
                          {String(ch.number).padStart(3, '0')}
                        </span>
                      </div>
                      <div className="lg-sel-logo-container">
                        {ch.logo ? (
                          <img
                            src={ch.logo}
                            alt={ch.name}
                            className="lg-sel-logo-img"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <span className="lg-sel-callsign">
                            {(ch.callsign || ch.name).slice(0, 6).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    /* ── Normal Row: Channel Number + Logo ── */
                    <>
                      <span className={`lg-row-number ${isLive ? 'lg-row-live' : ''}`}>
                        {String(ch.number).padStart(3, '0')}
                      </span>
                      <div className="lg-row-logo-wrap">
                        {ch.logo ? (
                          <img
                            src={ch.logo}
                            alt={ch.name}
                            className="lg-row-logo-img"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <span className="lg-row-fallback">
                            {(ch.callsign || ch.name).slice(0, 5).toUpperCase()}
                          </span>
                        )}
                      </div>
                      {channelNowTitles[ch.number] && (
                        <span className="lg-row-now-title" title={channelNowTitles[ch.number]}>
                          {channelNowTitles[ch.number]}
                        </span>
                      )}
                      <button
                        className={`lg-fav-star ${isFav ? 'lg-fav-active' : ''}`}
                        onClick={e => {
                          e.stopPropagation();
                          onToggleFavorite(ch.number);
                          sounds.playClick();
                        }}
                        title={isFav ? 'Remove favorite' : 'Add favorite'}
                      >
                        ★
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Program Listings Column: Floating directly over video ── */}
      <div className="lg-program-column">
        {selectedChannel ? (
          <div className="lg-prog-panel">
            {/* Main Program Title & Status — ONLY show program info if provided by API */}
            <div className="lg-prog-main-block">
              <h1 className="lg-title-current">
                {epg?.current?.title || selectedChannel.name}
              </h1>

              {epg?.current ? (
                <>
                  <p className="lg-label-on-now">On Now</p>
                  {epg.current.description && (
                    <p className="lg-prog-synopsis">{epg.current.description}</p>
                  )}
                  <p className="lg-prog-time">
                    {formatTimeRange(epg.current.startTime, epg.current.endTime)}
                  </p>
                </>
              ) : (
                <div className="lg-prog-meta-tags">
                  <span className="lg-tag-live">LIVE STREAM</span>
                  {selectedChannel.category && (
                    <span className="lg-tag-meta">{selectedChannel.category}</span>
                  )}
                  {selectedChannel.country && (
                    <span className="lg-tag-meta">{selectedChannel.country}</span>
                  )}
                </div>
              )}
            </div>

            {/* Next Program Up — ONLY if genuine epg?.next exists */}
            {epg?.next && (
              <div className="lg-prog-next-block">
                <p className="lg-title-next">{epg.next.title}</p>
                <p className="lg-label-on-next">On Next</p>
                <p className="lg-prog-time">
                  {formatTimeRange(epg.next.startTime, epg.next.endTime)}
                </p>
              </div>
            )}

            {/* Quick Actions for Selected Channel */}
            <div className="lg-prog-actions">
              <button
                className="lg-action-watch"
                onClick={() => watchCh(selectedChannel)}
              >
                ▶ {isCurrentChannelLive ? 'Watch Live' : 'Tune Channel'}
              </button>
              <button
                className={`lg-action-fav ${isSelectedFav ? 'lg-action-fav-active' : ''}`}
                onClick={() => {
                  onToggleFavorite(selectedChannel.number);
                  sounds.playClick();
                }}
              >
                {isSelectedFav ? '★ Favorited' : '☆ Favorite'}
              </button>
              <button
                className="lg-action-week"
                onClick={() => {
                  sounds.playClick();
                  setShowWeekModal(true);
                }}
                title="View 7-day schedule (W)"
              >
                📅 Shows for the Week (W)
              </button>
              {onToggleCaptions && (
                <button
                  className={`lg-action-cc ${captionsEnabled ? 'lg-action-cc-active' : ''}`}
                  onClick={() => {
                    onToggleCaptions();
                    sounds.playClick();
                  }}
                  title="Toggle English Captions (C)"
                >
                  CC {captionsEnabled ? 'ON' : 'OFF'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="lg-prog-empty">
            Select a channel to tune
          </div>
        )}
      </div>

      {/* Clock — Top right, clean plain text matching reference */}
      <div className="lg-clock">{fmtClock(clock)}</div>

      {/* Bottom hints */}
      <div className="lg-hints">
        <span><kbd>↑↓</kbd> Scroll</span>
        <span><kbd>PgUp/PgDn</kbd> Jump 10</span>
        <span><kbd>Enter</kbd> Watch</span>
        <span><kbd>F</kbd> Favorite</span>
        <span><kbd>W</kbd> Week Schedule</span>
        <span><kbd>C</kbd> CC ({captionsEnabled ? 'ON' : 'OFF'})</span>
        <span><kbd>[</kbd> Sidebar</span>
        <span><kbd>G</kbd> Close</span>
      </div>

      {/* ── 7-Day Weekly Broadcast Schedule Modal ── */}
      {showWeekModal && (
        <WeekScheduleModal
          channel={selectedChannel}
          countryCode={activeCountry || 'US'}
          onClose={() => setShowWeekModal(false)}
        />
      )}
    </div>
  );
}
