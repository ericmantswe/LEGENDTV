import { sounds } from '../utils/audioFX.js';

export default function RemoteControl({
  onChannelUp,
  onChannelDown,
  onVolumeUp,
  onVolumeDown,
  onMute,
  onGuide,
  onInfo,
  onToggleCaptions,
  captionsEnabled = true,
  isMuted,
  volume,
  currentChannel,
}) {
  const btn = (label, action, className = '') => (
    <button
      className={`rc-btn ${className}`}
      onClick={() => { sounds.playClick(); action(); }}
      title={label}
    >
      {label}
    </button>
  );

  return (
    <div className="remote-control">
      <div className="remote-brand">
        <img
          src="/Vibrant%20legendER%20TV%20Gradient%20Logo.png"
          alt="LEGEND ER TV"
          className="rc-brand-logo"
        />
      </div>

      {/* Power row */}
      <div className="rc-row">
        <button className="rc-btn rc-power" title="Power" onClick={() => sounds.playClick()}>⏻</button>
        <button className={`rc-btn rc-mute ${isMuted ? 'rc-mute-active' : ''}`} onClick={() => { sounds.playClick(); onMute(); }} title="Mute">
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Guide + Info + CC */}
      <div className="rc-row">
        {btn('GUIDE', onGuide, 'rc-guide-btn')}
        {btn('INFO', onInfo)}
        {onToggleCaptions && btn(captionsEnabled ? 'CC ON' : 'CC OFF', onToggleCaptions, captionsEnabled ? 'rc-cc-active' : '')}
      </div>

      {/* Channel up/down */}
      <div className="rc-dpad-label">CH</div>
      <div className="rc-row">
        {btn('▲', onChannelUp, 'rc-nav')}
      </div>
      <div className="rc-row rc-nav-row">
        <span className="rc-dpad-side">CH–</span>
        <button className="rc-btn rc-ok" onClick={() => sounds.playClick()}>OK</button>
        <span className="rc-dpad-side">CH+</span>
      </div>
      <div className="rc-row">
        {btn('▼', onChannelDown, 'rc-nav')}
      </div>

      {/* Volume */}
      <div className="rc-vol-section">
        <span className="rc-vol-label">VOL</span>
        <div className="rc-vol-row">
          {btn('–', onVolumeDown, 'rc-vol-btn')}
          <div className="rc-vol-bar">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={`rc-vol-seg ${i < Math.round(volume / 10) ? 'rc-vol-seg-on' : ''} ${isMuted ? 'rc-vol-muted' : ''}`}
              />
            ))}
          </div>
          {btn('+', onVolumeUp, 'rc-vol-btn')}
        </div>
      </div>

      {/* Number pad */}
      <div className="rc-numpad">
        {[1,2,3,4,5,6,7,8,9,null,0,null].map((n, i) => (
          n !== null
            ? <button key={i} className="rc-btn rc-numpad-btn" onClick={() => sounds.playClick()}>{n}</button>
            : <span key={i} className="rc-numpad-spacer" />
        ))}
      </div>
    </div>
  );
}

