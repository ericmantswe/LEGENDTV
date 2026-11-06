import { useState, useEffect } from 'react';
import './BootSplash.css';

export default function BootSplash({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 1600; // 1.6s smooth duration

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => setIsFading(true), 160);
        setTimeout(() => onComplete?.(), 460);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [onComplete]);

  // Click or keydown to skip immediately
  const skip = () => {
    setIsFading(true);
    setTimeout(() => onComplete?.(), 200);
  };

  useEffect(() => {
    const onKey = () => skip();
    window.addEventListener('keydown', onKey, { once: true });
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`boot-splash-overlay ${isFading ? 'boot-fade-out' : ''}`} onClick={skip}>
      <div className="boot-content">
        {/* Large Brand Logo */}
        <div className="boot-logo-wrap">
          <img
            src="/Vibrant%20legendER%20TV%20Gradient%20Logo.png"
            alt="LEGEND ER TV"
            className="boot-logo-large"
          />
        </div>

        {/* Progress Percentage Only */}
        <div className="boot-percentage">{progress}%</div>
      </div>
    </div>
  );
}
