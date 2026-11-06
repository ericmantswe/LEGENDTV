import { useState, useEffect } from 'react';
import './BootSplash.css';

export default function BootSplash({ onComplete }) {
  const [progress, setProgress] = useState(10);
  const [statusText, setStatusText] = useState('Initializing LEGEND ER TV…');
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setProgress(40);
      setStatusText('Connecting to Global Live Broadcast Streams…');
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(75);
      setStatusText('Loading 7-Day Program Guide & Channels…');
    }, 900);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Ready');
    }, 1500);

    const t4 = setTimeout(() => {
      setIsFading(true);
    }, 1750);

    const t5 = setTimeout(() => {
      onComplete?.();
    }, 2100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  // Click or keydown to skip immediately
  const skip = () => {
    setIsFading(true);
    setTimeout(() => onComplete?.(), 250);
  };

  useEffect(() => {
    const onKey = () => skip();
    window.addEventListener('keydown', onKey, { once: true });
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`boot-splash-overlay ${isFading ? 'boot-fade-out' : ''}`} onClick={skip}>
      <div className="boot-content">
        {/* Vibrant Brand Logo */}
        <div className="boot-logo-wrap">
          <img
            src="/Vibrant%20legendER%20TV%20Gradient%20Logo.png"
            alt="LEGEND ER TV"
            className="boot-logo-img"
          />
        </div>

        {/* Minimal TV Progress Bar */}
        <div className="boot-progress-track">
          <div className="boot-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Status text */}
        <div className="boot-status-text">{statusText}</div>

        <div className="boot-hint">Press any key or click to start</div>
      </div>
    </div>
  );
}
