import { useState, useEffect } from 'react';
import { loadCountries } from '../utils/iptvApi.js';
import { sounds } from '../utils/audioFX.js';
import { Search, X, Globe } from 'lucide-react';

export default function CountryModal({ activeCountry, onSelectCountry, onClose }) {
  const [countries, setCountries] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCountries()
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setCountries(sorted);
      })
      .catch(() => {})
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
      <div className="glass-modal-container">
        {/* Minimalist Top Bar */}
        <div className="glass-modal-topbar">
          <div className="glass-search-box">
            <Search size={16} className="glass-search-icon" />
            <input
              className="glass-search-input"
              type="text"
              placeholder="Search 200+ countries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <button className="glass-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Countries Grid */}
        <div className="glass-modal-grid">
          {/* Default Global Lineup */}
          <button
            className={`glass-country-item ${!activeCountry ? 'glass-item-active' : ''}`}
            onClick={() => handleChoose(null, 'Global Lineup', '🌐')}
          >
            <span className="glass-country-flag">🌐</span>
            <span className="glass-country-name">Global (All Channels)</span>
          </button>

          {filtered.map((c) => {
            const isSelected = activeCountry?.toUpperCase() === c.code.toUpperCase();
            return (
              <button
                key={c.code}
                className={`glass-country-item ${isSelected ? 'glass-item-active' : ''}`}
                onClick={() => handleChoose(c.code, c.name, c.flag || '🏳')}
              >
                <span className="glass-country-flag">{c.flag || '🏳'}</span>
                <span className="glass-country-name">{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
