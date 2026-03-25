import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

export default function InfluencerInsightsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

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

  if (loading) {
    return (
      <div className="card influencer-table-card">
        <div className="influencer-table-skeleton">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="influencer-skel-row" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card influencer-table-card">
        <p className="influencer-error">{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="card influencer-table-card">
        <div className="empty-state empty-state--soft">
          <span className="empty-state-icon" aria-hidden>
            👤
          </span>
          <p>No influencers yet — add videos with creator names and scrape.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card influencer-table-card">
        <div className="card-header influencer-table-header">
          <div>
            <h2>Influencers</h2>
            <p className="influencer-table-lead">
              Click a row for profile, performance, and recommended actions. Offer codes &amp; sales
              merge from per-video data and from the <strong>Offer maps</strong> sidebar page (unique
              codes). Colors reflect automated benchmarks.
            </p>
          </div>
        </div>

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

        <div className="table-wrap influencer-table-wrap">
          <table className="influencer-table">
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
              {rows.map((row) => (
                <tr
                  key={row.name}
                  className="influencer-row"
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
                  <td className="influencer-name-cell">{row.name}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <DrilldownPanel row={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
