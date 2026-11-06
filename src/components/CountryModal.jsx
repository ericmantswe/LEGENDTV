import { useState, useEffect } from 'react';
import { loadCountries, POPULAR_COUNTRIES } from '../utils/iptvApi.js';
import { sounds } from '../utils/audioFX.js';

export default function CountryModal({ activeCountry, onSelectCountry, onClose }) {
  const [countries, setCountries] = useState(POPULAR_COUNTRIES);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCountries()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setCountries(sorted);
      })
      .catch(() => {
        setCountries(POPULAR_COUNTRIES);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = countries.filter((c) => {
    const q = search.toLowerCase().trim();
    return !q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const handleChoose = (code, name, flag) => {
    sounds.playClick();
    onSelectCountry(code, name, flag);
    onClose();
  };

  return (
    <div className="guide-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="country-modal-panel">
        {/* Header */}
        <div className="country-modal-header">
          <div className="country-header-title-row">
            <span className="country-globe-icon">🌍</span>
            <div>
              <h2 className="country-modal-title">Select Country Lineup</h2>
              <p className="country-modal-sub">
                Switch channels to any of the 200+ countries from the IPTV-org directory
              </p>
            </div>
            <button className="guide-close" onClick={onClose}>✕</button>
          </div>

          {/* Search box */}
          <input
            className="country-search-input"
            type="text"
            placeholder="🔍 Search country by name or code (e.g. France, US, JP)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          {/* Quick preset chips */}
          <div className="country-chips-row">
            <span className="chips-label">Popular:</span>
            {POPULAR_COUNTRIES.slice(0, 8).map((pc) => (
              <button
                key={pc.code}
                className={`country-chip ${activeCountry === pc.code ? 'country-chip-active' : ''}`}
                onClick={() => handleChoose(pc.code, pc.name, pc.flag)}
              >
                {pc.flag} {pc.code}
              </button>
            ))}
          </div>
        </div>

        {/* Countries Grid */}
        <div className="country-grid-scroll">
          {/* Default Curated Lineup Option */}
          <button
            className={`country-card ${!activeCountry ? 'country-card-active' : ''}`}
            onClick={() => handleChoose(null, 'LEGEND TV Curated', '🌐')}
          >
            <span className="country-card-flag">🌐</span>
            <div className="country-card-info">
              <span className="country-card-name">LEGEND TV Default</span>
              <span className="country-card-code">Curated 24/7 Verified Channels</span>
            </div>
          </button>

          {filtered.map((c) => {
            const isSelected = activeCountry?.toUpperCase() === c.code.toUpperCase();
            return (
              <button
                key={c.code}
                className={`country-card ${isSelected ? 'country-card-active' : ''}`}
                onClick={() => handleChoose(c.code, c.name, c.flag || '🏳')}
              >
                <span className="country-card-flag">{c.flag || '🏳'}</span>
                <div className="country-card-info">
                  <span className="country-card-name">{c.name}</span>
                  <span className="country-card-code">{c.code}</span>
                </div>
                {isSelected && <span className="country-check-mark">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="country-modal-footer">
          <span>{filtered.length} countries available</span>
          <button className="country-cancel-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

