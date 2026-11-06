import { useEffect, useState } from 'react';
import { formatTimeRange } from '../utils/epgGenerator.js';
import { getLiveCurrentAndNext } from '../utils/epgService.js';

export default function ChannelBanner({ channel, visible, onOpenGuide, activeCountry = 'US' }) {
  const [epg, setEpg] = useState(null);

  useEffect(() => {
    if (!channel) return;
    let active = true;
    getLiveCurrentAndNext(channel, activeCountry).then(data => {
      if (active) setEpg(data);
    });
    const interval = setInterval(() => {
      getLiveCurrentAndNext(channel, activeCountry).then(data => {
        if (active) setEpg(data);
      });
    }, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [channel, activeCountry]);

  if (!channel) return null;

  const { current, next, progressPercent, remainingMinutes } = epg || {};

  return (
    <div className={`xfinity-osd-banner ${visible ? 'osd-visible' : 'osd-hidden'}`}>
      {/* Left: Channel Number + Callsign + Logo */}
      <div className="osd-channel-info">
        <div className="osd-ch-logo-wrap">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="osd-ch-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="osd-ch-fallback">{channel.callsign || channel.name.slice(0, 3)}</div>
          )}
        </div>
        <div className="osd-ch-meta">
          <div className="osd-ch-num">{channel.number}</div>
          <div className="osd-ch-callsign">{channel.callsign || channel.name.slice(0, 5).toUpperCase()}</div>
        </div>
      </div>

      {/* Center: Current Program Title & Progress */}
      <div className="osd-center-info">
        <div className="osd-prog-top">
          <span className="osd-prog-title">{current?.title || channel.name}</span>
          {current?.rating && <span className="osd-prog-rating">{current.rating}</span>}
          <span className="osd-badge-hd">HD</span>
        </div>

        {current?.description ? (
          <div className="osd-prog-desc">{current.description}</div>
        ) : channel.category ? (
          <div className="osd-prog-desc">{channel.category}{channel.country ? ` • ${channel.country}` : ''}</div>
        ) : null}

        {/* Progress bar — ONLY if genuine current program exists */}
        {current && (
          <div className="osd-progress-row">
            <span className="osd-prog-time">
              {formatTimeRange(current.startTime, current.endTime)}
            </span>
            <div className="osd-progress-track">
              <div
                className="osd-progress-fill"
                style={{ width: `${progressPercent || 0}%` }}
              />
            </div>
            {remainingMinutes > 0 && (
              <span className="osd-prog-remaining">
                {remainingMinutes} min left
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Next Up & Guide Button */}
      <div className="osd-right-info">
        {next && (
          <div className="osd-next-box">
            <div className="osd-next-label">UP NEXT</div>
            <div className="osd-next-title">{next.title}</div>
            <div className="osd-next-time">{formatTimeRange(next.startTime, next.endTime)}</div>
          </div>
        )}
        <button
          className="osd-guide-quickbtn"
          onClick={(e) => {
            e.stopPropagation();
            onOpenGuide();
          }}
        >
          Guide (G)
        </button>
      </div>
    </div>
  );
}
