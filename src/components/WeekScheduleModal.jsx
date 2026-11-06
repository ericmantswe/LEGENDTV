import { useState, useEffect } from 'react';
import { getChannelWeeklySchedule, formatTimeRange } from '../utils/epgService.js';
import { sounds } from '../utils/audioFX.js';
import { Calendar, Clock, X, ChevronRight } from 'lucide-react';

export default function WeekScheduleModal({ channel, countryCode = 'US', onClose }) {
  const [days, setDays] = useState([]);
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getChannelWeeklySchedule(channel, countryCode)
      .then((data) => {
        if (!active) return;
        setDays(data || []);
        // Set today as active day
        const todayIdx = data.findIndex(d => d.isToday);
        setActiveDayIdx(todayIdx !== -1 ? todayIdx : 0);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.warn('Could not load weekly schedule:', err);
        setLoading(false);
      });

    return () => { active = false; };
  }, [channel, countryCode]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        sounds.playClick();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        sounds.playClick();
        setActiveDayIdx(p => Math.max(0, p - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        sounds.playClick();
        setActiveDayIdx(p => Math.min(days.length - 1, p + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [days.length, onClose]);

  const activeDay = days[activeDayIdx];

  return (
    <div className="guide-overlay" onClick={onClose}>
      <div className="glass-modal-container week-modal" onClick={e => e.stopPropagation()}>

        {/* Modal Topbar */}
        <div className="glass-modal-topbar">
          <div className="glass-modal-heading">
            <Calendar size={18} className="glass-heading-icon" />
            <span>
              {channel?.name || 'Channel'} — 7-Day Weekly Guide
            </span>
          </div>
          <button className="glass-modal-close" onClick={onClose} title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Channel Identification Bar */}
        <div className="week-channel-bar">
          <div className="week-ch-info">
            <span className="week-ch-num">CH {String(channel?.number || 1).padStart(3, '0')}</span>
            <span className="week-ch-title">{channel?.name}</span>
            {channel?.category && <span className="week-ch-cat">{channel.category}</span>}
          </div>
          <span className="week-hint-nav">Use ← → to change day, Esc to close</span>
        </div>

        {/* Day Selector Tabs (Today + next 6 days) */}
        <div className="week-days-tabs">
          {days.map((d, idx) => {
            const isActive = idx === activeDayIdx;
            return (
              <button
                key={d.date}
                className={`week-day-tab ${isActive ? 'week-day-active' : ''}`}
                onClick={() => {
                  sounds.playClick();
                  setActiveDayIdx(idx);
                }}
              >
                <span className="week-tab-label">{d.dayLabel}</span>
                {d.shows?.length > 0 && (
                  <span className="week-tab-count">{d.shows.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Schedule List for the Active Day */}
        <div className="week-schedule-body">
          {loading ? (
            <div className="week-loading-state">
              <div className="spinner" />
              <span>Loading 7-day schedule for {channel?.name}…</span>
            </div>
          ) : !activeDay || activeDay.shows.length === 0 ? (
            <div className="week-empty-state">
              <Clock size={32} className="week-empty-icon" />
              <p className="week-empty-title">No scheduled broadcasts listed for {activeDay?.dayName || 'this date'}</p>
              <p className="week-empty-desc">
                Broadcast listings for this network are updated daily by television providers.
              </p>
            </div>
          ) : (
            <div className="week-shows-list">
              {activeDay.shows.map((show, i) => {
                const nowMs = Date.now();
                const isCurrent = nowMs >= show.startTime.getTime() && nowMs < show.endTime.getTime();

                return (
                  <div
                    key={`${show.id}-${i}`}
                    className={`week-show-row ${isCurrent ? 'week-show-now' : ''}`}
                  >
                    {/* Air Time Column */}
                    <div className="week-show-time-col">
                      <span className="week-time-start">
                        {show.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </span>
                      <span className="week-time-duration">{show.runtime} min</span>
                      {isCurrent && <span className="week-badge-now">ON NOW</span>}
                    </div>

                    {/* Show Details Column */}
                    <div className="week-show-info-col">
                      <div className="week-show-header">
                        <span className="week-show-name">{show.title}</span>
                        {show.rating && <span className="week-show-rating">{show.rating}</span>}
                      </div>

                      {show.episodeTitle && (
                        <div className="week-show-ep-title">{show.episodeTitle}</div>
                      )}

                      {show.description && (
                        <p className="week-show-desc">{show.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="week-modal-footer">
          <span className="week-footer-total">
            {activeDay?.shows?.length || 0} scheduled show{activeDay?.shows?.length === 1 ? '' : 's'} on {activeDay?.dayName || ''}
          </span>
          <button className="glass-btn-primary" onClick={onClose}>
            Back to Guide
          </button>
        </div>

      </div>
    </div>
  );
}
