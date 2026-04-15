import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { FiSearch, FiDownload, FiTrendingUp } from 'react-icons/fi';
import { fetchInfluencerInsights } from '../services/api';

function TierDot({ tier }) {
  const label =
    tier === 'scale'
      ? 'Scale aggressively'
      : tier === 'test'
        ? 'Test more'
        : 'Avoid';
  return (
    <span
      className={`influencer-tier-dot influencer-tier-dot--${tier}`}
      title={label}
      aria-label={label}
    />
  );
}

function DrilldownPanel({ row, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (!row) return null;

  const panel = (
    <div
      className="influencer-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="influencer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="influencer-drilldown-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="influencer-modal-head">
          <h2 id="influencer-drilldown-title" className="influencer-modal-title">
            Creator detail
          </h2>
          <button
            type="button"
            className="influencer-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="influencer-drilldown">
          <section className="influencer-drilldown-section">
            <h3 className="influencer-drilldown-heading">👤 Influencer profile</h3>
            <p className="influencer-drilldown-mono">{row.name}</p>
          </section>

          <section className="influencer-drilldown-section">
            <h3 className="influencer-drilldown-heading">📊 Performance</h3>
            <dl className="influencer-drilldown-dl">
              <div>
                <dt>Avg views</dt>
                <dd className="influencer-drilldown-mono">
                  {row.avgViews.toLocaleString()}{' '}
                  <span className="influencer-drilldown-muted">/ video</span>
                </dd>
              </div>
              <div>
                <dt>Engagement trend</dt>
                <dd className="influencer-drilldown-mono">{row.engagementTrend}</dd>
              </div>
              <div>
                <dt>Engagement rate</dt>
                <dd className="influencer-drilldown-mono">{row.engagementPct}%</dd>
              </div>
              <div>
                <dt>Videos tracked</dt>
                <dd className="influencer-drilldown-mono">{row.videoCount}</dd>
              </div>
              <div>
                <dt>Offer codes</dt>
                <dd className="influencer-drilldown-mono">{row.offerCodes || '—'}</dd>
              </div>
              <div>
                <dt>Sales (sum)</dt>
                <dd className="influencer-drilldown-mono">
                  {row.sales != null ? row.sales.toLocaleString() : '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="influencer-drilldown-section">
            <h3 className="influencer-drilldown-heading">🧠 AI classification</h3>
            <dl className="influencer-drilldown-dl">
              <div>
                <dt>Category</dt>
                <dd className="influencer-drilldown-mono">{row.category}</dd>
              </div>
              <div>
                <dt>Audience</dt>
                <dd className="influencer-drilldown-mono">{row.audience}</dd>
              </div>
            </dl>
          </section>

          <section className="influencer-drilldown-section">
            <h3 className="influencer-drilldown-heading">💡 Insight</h3>
            <p className="influencer-drilldown-body">{row.insight}</p>
          </section>

          <section className="influencer-drilldown-section influencer-drilldown-section--action">
            <h3 className="influencer-drilldown-heading">🚀 Action</h3>
            <p className="influencer-drilldown-body">{row.action}</p>
          </section>
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}

function CreatorAvatar({ name }) {
  const initials = String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return <div className="creators-ecosystem-avatar">{initials || '?'}</div>;
}

const FAV_KEY = 'antrack-creator-favorites';

function loadFavoriteSet() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveFavoriteSet(set) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export default function InfluencerInsightsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [favorites, setFavorites] = useState(() => loadFavoriteSet());

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchInfluencerInsights()
      .then((res) => setRows(res.data))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onUp = () => load();
    window.addEventListener('videos-updated', onUp);
    return () => window.removeEventListener('videos-updated', onUp);
  }, [load]);

  const kpis = useMemo(() => {
    if (!rows.length) {
      return { creators: 0, portfolioViews: 0, avgEng: 0 };
    }
    const portfolioViews = rows.reduce(
      (s, r) => s + (r.avgViews || 0) * (r.videoCount || 0),
      0
    );
    const avgEng =
      rows.reduce((s, r) => s + (r.engagementPct || 0), 0) / rows.length;
    return {
      creators: rows.length,
      portfolioViews,
      avgEng: Number(avgEng.toFixed(2)),
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    let r = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (row) =>
          (row.name || '').toLowerCase().includes(q) ||
          (row.offerCodes || '').toLowerCase().includes(q)
      );
    }
    if (segment === 'favorites') {
      r = r.filter((row) => favorites.has(row.name));
    }
    return r;
  }, [rows, search, segment, favorites]);

  const toggleFavorite = (e, name) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      saveFavoriteSet(next);
      return next;
    });
  };

  const exportCsv = () => {
    if (!filteredRows.length) {
      toast.error('No rows to export');
      return;
    }
    const headers = [
      'influencer',
      'offer_codes',
      'videos',
      'avg_views',
      'engagement_pct',
      'sales',
    ];
    const lines = filteredRows.map((row) => {
      const name = String(row.name || '').replace(/"/g, '""');
      const codes = String(row.offerCodes || '').replace(/"/g, '""');
      const sales =
        row.sales != null ? row.sales : '';
      return `"${name}","${codes}",${row.videoCount},${row.avgViews},${row.engagementPct},${sales}`;
    });
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `creators-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('CSV downloaded');
  };

  if (loading) {
    return (
      <div className="creators-ecosystem">
        <div className="creators-ecosystem-kpis">
          {[1, 2, 3].map((i) => (
            <div key={i} className="stat-card stat-card-skeleton" aria-hidden />
          ))}
        </div>
        <div className="card influencer-table-card">
          <div className="influencer-table-skeleton">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="influencer-skel-row" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="creators-ecosystem">
        <p className="influencer-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="creators-ecosystem">
      <div className="creators-ecosystem-header">
        <div>
          <h2 className="creators-ecosystem-title">Creator ecosystem</h2>
          <p className="creators-ecosystem-lead">
            Manage and analyze your network of talent. Offer codes &amp; sales merge from videos and{' '}
            <strong>Offer maps</strong>.
          </p>
        </div>
        <div className="creators-ecosystem-header-actions">
          <button type="button" className="btn btn-secondary creators-ecosystem-btn" onClick={exportCsv}>
            <FiDownload size={16} />
            Export talent list
          </button>
        </div>
      </div>

      <div className="creators-ecosystem-kpis stats-row">
        <div className="stat-card stat-card--compact stat-card--videos">
          <div className="stat-card-accent" aria-hidden />
          <div className="label">Active creators</div>
          <div className="value">{kpis.creators.toLocaleString()}</div>
        </div>
        <div className="stat-card stat-card--compact stat-card--views">
          <div className="stat-card-accent" aria-hidden />
          <div className="label">Portfolio views</div>
          <div className="value">{kpis.portfolioViews.toLocaleString()}</div>
          {/* <div className="stat-sub">Σ (avg views × videos)</div> */}
        </div>
        <div className="stat-card stat-card--compact stat-card--engagement">
          <div className="stat-card-accent" aria-hidden />
          <div className="label">Avg engagement</div>
          <div className="value accent">{kpis.avgEng}%</div>
          <div className="stat-sub creators-ecosystem-kpi-trend">
            <FiTrendingUp size={14} aria-hidden />
            Roster mean
          </div>
        </div>
      </div>

      <div className="creators-ecosystem-toolbar">
        <div className="creators-ecosystem-search-wrap">
          <FiSearch className="creators-ecosystem-search-icon" size={18} aria-hidden />
          <input
            type="search"
            className="creators-ecosystem-search"
            placeholder="Search by influencer name or offer code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search by influencer or offer code"
          />
        </div>
        <div className="creators-ecosystem-segments" role="tablist" aria-label="Creator segments">
          {[
            { id: 'all', label: 'All talent' },
            { id: 'favorites', label: 'Favorites' },
          ].map((seg) => (
            <button
              key={seg.id}
              type="button"
              role="tab"
              aria-selected={segment === seg.id}
              className={`creators-ecosystem-seg ${segment === seg.id ? 'creators-ecosystem-seg--active' : ''}`}
              onClick={() => setSegment(seg.id)}
            >
              {seg.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card influencer-table-card">
          <div className="empty-state empty-state--soft">
            <span className="empty-state-icon" aria-hidden>
              👤
            </span>
            <p>No influencers yet — add videos with creator names and scrape.</p>
          </div>
        </div>
      ) : (
        <div className="creators-ecosystem-table-card card influencer-table-card">
          <div className="influencer-legend" aria-hidden>
            <span>
              <TierDot tier="scale" /> Scale aggressively
            </span>
            <span>
              <TierDot tier="test" /> Test more
            </span>
            <span>
              <TierDot tier="avoid" /> Avoid
            </span>
          </div>

          <div className="table-wrap influencer-table-wrap creators-ecosystem-table-wrap">
            <table className="influencer-table creators-ecosystem-table">
              <thead>
                <tr>
                  <th className="influencer-th-narrow" aria-label="Recommendation" />
                  <th>Influencer</th>
                  <th>Offer codes</th>
                  <th>Videos</th>
                  <th>Avg views</th>
                  <th>Engagement</th>
                  <th>Sales</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="creators-ecosystem-empty">
                      No creators match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.name}
                      className="influencer-row creators-ecosystem-row"
                      onClick={() => setSelected(row)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelected(row);
                        }
                      }}
                      tabIndex={0}
                      aria-label={`Open details for ${row.name}`}
                    >
                      <td>
                        <TierDot tier={row.tier} />
                      </td>
                      <td>
                        <div className="creators-ecosystem-name-cell">
                          <CreatorAvatar name={row.name} />
                          <div>
                            <div className="creators-ecosystem-name-row">
                              <span className="influencer-name-cell">{row.name}</span>
                            </div>
                            <div className="creators-ecosystem-category">{row.category}</div>
                            <button
                              type="button"
                              className="creators-ecosystem-fav-text"
                              onClick={(e) => toggleFavorite(e, row.name)}
                            >
                              {favorites.has(row.name) ? 'Saved to favorites' : 'Save to favorites'}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="influencer-offer-cell" title={row.offerCodes || ''}>
                        {row.offerCodes || '—'}
                      </td>
                      <td>{row.videoCount}</td>
                      <td>{row.avgViews.toLocaleString()}</td>
                      <td>
                        <span className="influencer-eng">{row.engagementPct}%</span>
                      </td>
                      <td className="influencer-sales-cell">
                        {row.sales != null ? row.sales.toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredRows.length > 0 && (
            <p className="creators-ecosystem-table-hint">
              Click a row for full analytics. Showing {filteredRows.length.toLocaleString()} of{' '}
              {rows.length.toLocaleString()} creators
              {search.trim() || segment !== 'all' ? ' (filtered)' : ''}.
            </p>
          )}
        </div>
      )}

      {selected && <DrilldownPanel row={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
