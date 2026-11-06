import { useState, useEffect, useCallback } from 'react';
import { loadApiChannels, loadCountries, loadCategories } from '../utils/iptvApi.js';
import { sounds } from '../utils/audioFX.js';

const CATEGORIES = [
  'animation', 'auto', 'business', 'classic', 'comedy', 'cooking',
  'culture', 'documentary', 'education', 'entertainment', 'family',
  'general', 'health', 'history', 'hobby', 'kids', 'legislative',
  'lifestyle', 'movies', 'music', 'nature', 'news', 'outdoor',
  'pets', 'politics', 'religious', 'rental', 'series', 'shop',
  'sports', 'travel', 'weather', 'xxx',
];

export default function ApiBrowser({ onLoadChannels, onClose }) {
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [limit, setLimit] = useState(150);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); // { count }

  useEffect(() => {
    loadCountries()
      .then(data => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setCountries(sorted);
      })
      .catch(() => {});
  }, []);

  const handleLoad = useCallback(async () => {
    setLoading(true);
    setError('');
    setPreview(null);
    sounds.playGuideSound(true);
    try {
      const channels = await loadApiChannels({
        country: country || null,
        category: category || null,
        language: language || null,
        noNsfw: true,
        limit,
      });

      if (channels.length === 0) {
        setError('No channels found with these filters. Try broadening your search.');
        setLoading(false);
        return;
      }

      setPreview({ count: channels.length });
      onLoadChannels(channels);
      sounds.playGuideSound(false);
      onClose();
    } catch (e) {
      setError(`Failed to load: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [country, category, language, limit, onLoadChannels, onClose]);

  return (
    <div className="guide-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="api-browser-panel">

        <div className="api-browser-header">
          <span className="guide-logo">🌐</span>
          <div>
            <h2 className="api-browser-title">IPTV-org Live Channel Browser</h2>
            <p className="api-browser-sub">
              Loads real-time channel data from{' '}
              <span className="api-link">iptv-org.github.io/api</span>
              {' '}— 15 000+ channels worldwide
            </p>
          </div>
          <button className="guide-close" onClick={onClose}>✕</button>
        </div>

        <div className="api-browser-body">
          {/* Country */}
          <div className="api-field">
            <label className="api-label">🌍 Country</label>
            <select
              className="api-select"
              value={country}
              onChange={e => setCountry(e.target.value)}
            >
              <option value="">All Countries</option>
              {countries.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag ? `${c.flag} ` : ''}{c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="api-field">
            <label className="api-label">📺 Category</label>
            <select
              className="api-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.filter(c => c !== 'xxx').map(c => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div className="api-field">
            <label className="api-label">🗣 Language (ISO-639-3)</label>
            <input
              className="api-input"
              type="text"
              placeholder="e.g. eng, fra, ara, spa, zho…"
              value={language}
              onChange={e => setLanguage(e.target.value.toLowerCase().trim())}
              maxLength={3}
            />
          </div>

          {/* Limit */}
          <div className="api-field">
            <label className="api-label">📶 Max channels to load</label>
            <div className="api-limit-row">
              {[50, 100, 150, 250, 500].map(n => (
                <button
                  key={n}
                  className={`api-limit-btn ${limit === n ? 'api-limit-active' : ''}`}
                  onClick={() => { sounds.playClick(); setLimit(n); }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="api-error">{error}</div>}
          {preview && (
            <div className="api-preview">
              ✅ Loaded {preview.count} channels — switching to channel guide…
            </div>
          )}
        </div>

        <div className="api-browser-footer">
          <div className="api-note">
            ⚠ Streams from iptv-org are community-maintained. Some may be offline or geo-restricted.
          </div>
          <div className="api-actions">
            <button className="api-cancel-btn" onClick={onClose}>Cancel</button>
            <button
              className={`api-load-btn ${loading ? 'api-load-btn-loading' : ''}`}
              onClick={handleLoad}
              disabled={loading}
            >
              {loading ? (
                <><span className="btn-spinner" /> Loading…</>
              ) : (
                '📡 Load Channels'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

