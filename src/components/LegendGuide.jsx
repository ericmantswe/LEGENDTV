import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getCurrentAndNextProgram } from '../utils/epgGenerator.js';
import { sounds } from '../utils/audioFX.js';
import {
  Tv,
  Star,
  Search,
  Globe,
  Sliders,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import './LegendGuide.css';

/* ── Constants ──────────────────────────────────────────── */
const VISIBLE = 7;    // rows visible at once (3 above + selected + 3 below)
const ROW_H   = 56;   // px — normal channel row height
const SEL_H   = 112;  // px — selected channel row height (2× normal)

const NAV_ITEMS = [
  { id: 'settings',  label: 'SETTINGS',  icon: Settings },
  { id: 'search',    label: 'SEARCH',    icon: Search   },
  { id: 'live',      label: 'LIVE TV',   icon: Tv       },
  { id: 'favorites', label: 'FAVORITES', icon: Star     },
  { id: 'countries', label: 'COUNTRIES', icon: Globe    },
  { id: 'iptv',      label: 'IPTV-ORG',  icon: Sliders  },
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
  activeCountryFlag,
  activeCountryName,
  isFullscreen,
  onToggleFullscreen,
}) {
  const [tab, setTab] = useState('live');
  const [query, setQuery] = useState('');
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
    if (tab === 'search') setTimeout(() => searchRef.current?.focus(), 60);
  }, [tab]);

  /* Filtered channel list */
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

  /* Windowed view centered on selected */
  const safe    = Math.min(selIdx, Math.max(0, list.length - 1));
  const half    = Math.floor(VISIBLE / 2); // 3
  const wStart  = Math.max(0, Math.min(safe - half, Math.max(0, list.length - VISIBLE)));
  const visible = list.slice(wStart, wStart + VISIBLE);
  const selWin  = safe - wStart; // index in visible[]

  /* Tab / action handler */
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
        case 'Enter':
          if (inp) return;
          e.preventDefault();
          if (list[safe]) watchCh(list[safe]);
          break;
        case 'f':
        case 'F':
          if (inp) return;
          if (list[safe]) {
            onToggleFavorite(list[safe].number);
            sounds.playClick();
          }
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
  }, [list, safe, watchCh, onCloseGuide, onToggleFavorite, toggleSidebar]);

  return (
    <div className="lg-wrap">

      {/* Floating Glass Search Bar (active when tab === 'search') */}
      {tab === 'search' && (
        <div className="lg-glass-search">
          <Search size={18} className="lg-search-icon" />
          <input
            ref={searchRef}
            className="lg-search-input"
            type="text"
            placeholder="Search channels, numbers, categories…"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelIdx(0); }}
          />
          {query && (
            <button className="lg-search-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>
      )}

      {/* ── Frosted Glass Left Container ─────────────────── */}
      <div className={`lg-glass-panel ${isCollapsed ? 'lg-collapsed' : ''}`}>

        {/* Collapsible Sidebar */}
        <nav className={`lg-sidebar ${isCollapsed ? 'sidebar-min' : ''}`}>
          {/* Collapse / Expand Toggle Button */}
          <div className="lg-sidebar-toggle-wrap">
            <button
              className="lg-sidebar-toggle"
              onClick={toggleSidebar}
              title={isCollapsed ? 'Expand sidebar ([)' : 'Collapse sidebar ([)'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
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
                  className={`lg-nav-btn ${isActive ? 'lg-nav-on' : ''}`}
                  onClick={() => changeTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={18} className="lg-nav-icon" />
                  {!isCollapsed && <span className="lg-nav-label">{item.label}</span>}
                </button>
              );
            })}
          </div>

          {/* Country Indicator / Quick selector */}
          <button
            className="lg-country-btn"
            onClick={onOpenCountryModal}
            title={`Active: ${activeCountryName} — Click to change`}
          >
            <span className="lg-country-flag">{activeCountryFlag || '🌐'}</span>
            {!isCollapsed && (
              <span className="lg-country-text">{activeCountryName || 'Global'}</span>
            )}
          </button>
        </nav>

        {/* Channel Column (Numbers + Logos) */}
        <div className="lg-ch-col">
          {list.length === 0 && (
            <div className="lg-empty">
              {tab === 'favorites' ? '⭐ No favourites saved' : '🔍 No channels found'}
            </div>
          )}

          {visible.map((ch, i) => {
            const isSel  = i === selWin;
            const isFav  = favorites.includes(ch.number);
            const isLive = ch.number === currentChannel?.number;

            return (
              <div
                key={ch.number}
                className={`lg-ch-row ${isSel ? 'lg-ch-sel' : ''}`}
                style={{ height: isSel ? SEL_H : ROW_H }}
                onClick={() => { setSelIdx(wStart + i); onSelectChannel(ch); }}
                onDoubleClick={() => watchCh(ch)}
              >
                {isSel ? (
                  /* Selected Row: Big Glass Card with number top-right & large logo */
                  <>
                    <div className="lg-sel-top">
                      {isLive && <span className="lg-live-dot" title="Now Tuning Live" />}
                      <span className="lg-sel-num">
                        {String(ch.number).padStart(3, '0')}
                      </span>
                    </div>
                    <div className="lg-sel-logo">
                      {ch.logo ? (
                        <img
                          src={ch.logo}
                          alt={ch.name}
                          className="lg-sel-img"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <span className="lg-sel-fallback">
                          {(ch.callsign || ch.name).slice(0, 6).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  /* Normal Row: Channel Number + Logo inline */
                  <>
                    <span className={`lg-ch-num ${isLive ? 'lg-ch-live' : ''}`}>
                      {String(ch.number).padStart(3, '0')}
                    </span>
                    <div className="lg-logo-wrap">
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
                    <button
                      className={`lg-star ${isFav ? 'lg-star-on' : ''}`}
                      onClick={e => {
                        e.stopPropagation();
                        onToggleFavorite(ch.number);
                        sounds.playClick();
                      }}
                      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
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

      {/* ── Program Titles: Translucent text floating over video ── */}
      <div className="lg-progs">
        {visible.map((ch, i) => {
          const isSel = i === selWin;
          const h     = isSel ? SEL_H : ROW_H;
          const epg   = getCurrentAndNextProgram(ch, new Date());

          return (
            <div
              key={ch.number}
              className={`lg-prog-row ${isSel ? 'lg-prog-sel' : ''}`}
              style={{ height: h, flexShrink: 0 }}
              onClick={() => { setSelIdx(wStart + i); onSelectChannel(ch); }}
              onDoubleClick={() => watchCh(ch)}
            >
              {isSel ? (
                /* Selected: Title + "On Now" in vibrant green + Next title + "On Next" */
                <>
                  <p className="lg-prog-title">
                    {epg?.current?.title || ch.name}
                  </p>
                  <p className="lg-on-now">On Now</p>
                  {epg?.next && (
                    <p className="lg-prog-next">{epg.next.title}</p>
                  )}
                  {epg?.next && (
                    <p className="lg-on-next">On Next</p>
                  )}
                </>
              ) : (
                /* Normal: Title with soft glass drop-shadow */
                <p className="lg-prog-dim">
                  {epg?.current?.title || ch.name}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Glass Clock (Top-Right) */}
      <div className="lg-clock-glass">
        <span>{fmtClock(clock)}</span>
      </div>

      {/* Bottom Glass Navigation Hints */}
      <div className="lg-kbd-glass">
        <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
        <span><kbd>Enter</kbd> Watch</span>
        <span><kbd>F</kbd> Favorite</span>
        <span><kbd>[</kbd> Toggle Sidebar</span>
        <span><kbd>Esc</kbd> Close</span>
      </div>
    </div>
  );
}
