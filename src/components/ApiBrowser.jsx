import { useState, useEffect, useCallback } from 'react';
import { loadApiChannels, loadCountries } from '../utils/iptvApi.js';
import { sounds } from '../utils/audioFX.js';
import { X, Sliders } from 'lucide-react';

const CATEGORIES = [
  'animation', 'auto', 'business', 'classic', 'comedy', 'cooking',
  'culture', 'documentary', 'education', 'entertainment', 'family',
  'general', 'health', 'history', 'hobby', 'kids', 'legislative',
  'lifestyle', 'movies', 'music', 'nature', 'news', 'outdoor',
  'pets', 'politics', 'religious', 'series', 'shop',
  'sports', 'travel', 'weather'
];

export default function ApiBrowser({ onLoadChannels, onClose }) {
  const [countries, setCountries] = useState([]);
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState('');
  const [limit, setLimit] = useState(250);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    sounds.playGuideSound(true);
    try {
      const channels = await loadApiChannels({
        country: country || null,
        category: category || null,
        noNsfw: true,
        limit,
      });

      if (channels.length === 0) {
        setError('No channels found with these filters.');
        setLoading(false);
        return;
      }

      onLoadChannels(channels);
      sounds.playGuideSound(false);
      onClose();
    } catch (e) {
      setError(`Failed to load: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [country, category, limit, onLoadChannels, onClose]);

  return (
    <div className="guide-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass-modal-container glass-modal-narrow">
        {/* Top Header */}
        <div className="glass-modal-topbar">
          <div className="glass-modal-heading">
            <Sliders size={18} className="glass-heading-icon" />
            <span>IPTV-org Directory Filter</span>
          </div>
          <button className="glass-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Clean Form */}
        <div className="glass-form-body">
          <div className="glass-form-row">
            <label className="glass-form-label">Country</label>
            <select
              className="glass-form-select"
              value={country}
              onChange={e => setCountry(e.target.value)}
            >
              <option value="">All Countries Worldwide</option>
              {countries.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag ? `${c.flag} ` : ''}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="glass-form-row">
            <label className="glass-form-label">Category</label>
            <select
              className="glass-form-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="glass-form-row">
            <label className="glass-form-label">Max Channels</label>
            <div className="glass-pill-options">
              {[100, 250, 500].map(n => (
                <button
                  key={n}
                  className={`glass-pill-btn ${limit === n ? 'glass-pill-active' : ''}`}
                  onClick={() => { sounds.playClick(); setLimit(n); }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="glass-form-error">{error}</div>}

          <div className="glass-form-actions">
            <button className="glass-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="glass-btn-primary"
              onClick={handleLoad}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Load Lineup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
