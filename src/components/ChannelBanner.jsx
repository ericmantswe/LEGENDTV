import { useEffect, useState } from 'react';
import { getCurrentAndNextProgram, formatTimeRange } from '../utils/epgGenerator.js';

export default function ChannelBanner({ channel, visible, onOpenGuide }) {
  const [epg, setEpg] = useState(null);

  useEffect(() => {
    if (!channel) return;
    setEpg(getCurrentAndNextProgram(channel, new Date()));
    const interval = setInterval(() => {
      setEpg(getCurrentAndNextProgram(channel, new Date()));
    }, 30000);
    return () => clearInterval(interval);
  }, [channel]);

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
          <span className="osd-prog-rating">{current?.rating || 'TV-PG'}</span>
          <span className="osd-badge-hd">HD</span>
        </div>

        <div className="osd-prog-desc">
          {current?.description || channel.description}
        </div>

        {/* Xfinity yellow progress bar */}
        <div className="osd-progress-row">
          <span className="osd-prog-time">
            {current ? formatTimeRange(current.startTime, current.endTime) : ''}
          </span>
          <div className="osd-progress-track">
            <div
              className="osd-progress-fill"
              style={{ width: `${progressPercent || 25}%` }}
            />
          </div>
          <span className="osd-prog-remaining">
            {remainingMinutes ? `${remainingMinutes} min left` : ''}
          </span>
        </div>
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
