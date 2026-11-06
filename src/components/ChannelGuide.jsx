import { useState, useEffect } from 'react';
import { formatChannelNum } from '../utils/m3uParser.js';
import { getCurrentAndNextProgram } from '../utils/epgGenerator.js';
import { sounds } from '../utils/audioFX.js';

export default function ChannelGuide({ channels, currentChannel, onSelectChannel, onClose }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [epgData, setEpgData] = useState({});
  const [now, setNow] = useState(new Date());

  // Load EPG for all visible channels
  useEffect(() => {
    const data = {};
    channels.forEach(ch => {
      data[ch.number] = getCurrentAndNextProgram(ch, now);
    });
    setEpgData(data);
  }, [channels, now]);

  // Tick every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const categories = ['all', ...new Set(channels.map(c => c.category).filter(Boolean))];

  const filtered = channels.filter(ch => {
    const matchCat = filter === 'all' || ch.category?.toLowerCase() === filter?.toLowerCase();
    const matchSearch = !search ||
      ch.name.toLowerCase().includes(search.toLowerCase()) ||
      ch.category?.toLowerCase().includes(search.toLowerCase()) ||
      String(ch.number).includes(search);
    return matchCat && matchSearch;
  });

  const handleSelect = (ch) => {
    sounds.playChannelSwitch();
    onSelectChannel(ch);
    onClose();
  };

  return (
    <div className="guide-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="guide-panel">
        {/* Guide Header */}
        <div className="guide-header">
          <div className="guide-title-row">
            <span className="guide-logo">📺</span>
            <h2 className="guide-title">LEGEND TV — Channel Guide</h2>
            <div className="guide-clock">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <button className="guide-close" onClick={onClose}>✕</button>
          </div>

          {/* Search */}
          <input
            className="guide-search"
            placeholder="🔍  Search channels, categories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />

          {/* Category tabs */}
          <div className="guide-tabs">
            {categories.map(cat => (
              <button
                key={cat}
                className={`guide-tab ${filter === cat ? 'guide-tab-active' : ''}`}
                onClick={() => { sounds.playClick(); setFilter(cat); }}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Channel List */}
        <div className="guide-list">
          {filtered.length === 0 && (
            <div className="guide-empty">No channels found.</div>
          )}
          {filtered.map(ch => {
            const isActive = ch.number === currentChannel?.number;
            const epg = epgData[ch.number];
            const prog = epg?.current;
            return (
              <div
                key={ch.number}
                className={`guide-row ${isActive ? 'guide-row-active' : ''}`}
                onClick={() => handleSelect(ch)}
              >
                {/* Channel Number */}
                <div className="guide-ch-num">{formatChannelNum(ch.number)}</div>

                {/* Logo */}
                <div className="guide-ch-logo-wrap">
                  {ch.logo ? (
                    <img
                      src={ch.logo}
                      alt={ch.name}
                      className="guide-ch-logo"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="guide-ch-logo-placeholder">{ch.name.charAt(0)}</div>
                  )}
                </div>

                {/* Name + Info */}
                <div className="guide-ch-info">
                  <div className="guide-ch-name">{ch.name}</div>
                  {prog && <div className="guide-ch-prog">{prog.title}</div>}
                </div>

                {/* Category Badge */}
                <div className={`guide-category-badge cat-${ch.category?.toLowerCase().replace(/\s+/g, '-')}`}>
                  {ch.category}
                </div>

                {/* Progress */}
                {epg && (
                  <div className="guide-ch-progress">
                    <div className="guide-progress-bar">
                      <div
                        className="guide-progress-fill"
                        style={{ width: `${epg.progressPercent}%` }}
                      />
                    </div>
                    <span className="guide-progress-remaining">{epg.remainingMinutes}m</span>
                  </div>
                )}

                {isActive && <div className="guide-now-playing-dot">●</div>}
              </div>
            );
          })}
        </div>

        <div className="guide-footer">
          <span>↑↓ Navigate</span>
          <span>ENTER Select</span>
          <span>ESC Close</span>
          <span className="guide-footer-count">{filtered.length} channels</span>
        </div>
      </div>
    </div>
  );
}

