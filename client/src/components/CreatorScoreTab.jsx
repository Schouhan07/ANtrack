import React, { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { fetchCreatorScores } from '../services/api';

function fmt(n, digits = 2) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function rankTone(idx) {
  if (idx === 0) return 'gold';
  if (idx === 1) return 'silver';
  if (idx === 2) return 'bronze';
  return '';
}

export default function CreatorScoreTab() {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetchCreatorScores()
      .then((res) => setCreators(res.data?.creators || []))
      .catch(() => toast.error('Could not load creator scores'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const onUp = () => load();
    window.addEventListener('videos-updated', onUp);
    return () => window.removeEventListener('videos-updated', onUp);
  }, [load]);

  const top10 = useMemo(() => creators.slice(0, 10), [creators]);

  if (loading) {
    return (
      <div className="creator-score-page">
        <div className="influencer-table-skeleton" style={{ maxWidth: 960, margin: '0 auto' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="influencer-skel-row" />
          ))}
        </div>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="creator-score-page">
        <div className="card empty-state empty-state--soft" style={{ maxWidth: 640, margin: '0 auto' }}>
          <p>No scored creators yet — add tracked videos with creator names and run a scrape.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="creator-score-page">
      <section className="card creator-score-table-card" aria-label="Top 10 creators by content score">
        <div className="creator-score-table-head">
          <div>
            <h2 className="creator-score-table-title">Top 10 creators</h2>
            <p className="creator-score-table-sub">Ranked by content score · latest scrape per video</p>
          </div>
        </div>
        <div className="creator-score-table-scroll">
          <table className="creator-score-table">
            <thead>
              <tr>
                <th className="creator-score-th-rank">#</th>
                <th>Creator</th>
                <th className="creator-score-th-num">Score</th>
                <th className="creator-score-th-num creator-score-th-sub">E</th>
                <th className="creator-score-th-num creator-score-th-sub">C</th>
                <th className="creator-score-th-num creator-score-th-sub">Eff</th>
                <th className="creator-score-th-num creator-score-th-sub">I</th>
                <th className="creator-score-th-num creator-score-th-raw">Eng°</th>
                <th className="creator-score-th-num creator-score-th-raw">Int°</th>
                <th className="creator-score-th-num">CPT</th>
                <th className="creator-score-th-num">Views</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((r, idx) => {
                const tone = rankTone(idx);
                return (
                  <tr
                    key={r.name}
                    className={`creator-score-tr${tone ? ` creator-score-tr--${tone}` : ''}`}
                  >
                    <td className="creator-score-rank">
                      <span className="creator-score-rank-badge">{idx + 1}</span>
                    </td>
                    <td className="creator-score-name">{r.name}</td>
                    <td className="creator-score-num creator-score-num--accent">{fmt(r.contentScore)}</td>
                    <td className="creator-score-num creator-score-num--sub">{fmt(r.engagementScore, 0)}</td>
                    <td className="creator-score-num creator-score-num--sub">{fmt(r.conversionScore, 0)}</td>
                    <td className="creator-score-num creator-score-num--sub">{fmt(r.efficiencyScore, 0)}</td>
                    <td className="creator-score-num creator-score-num--sub">{fmt(r.intentScore, 0)}</td>
                    <td className="creator-score-num creator-score-num--raw">{fmt(r.engagementRaw, 4)}</td>
                    <td className="creator-score-num creator-score-num--raw">{fmt(r.intentRaw, 4)}</td>
                    <td className="creator-score-num">
                      {r.cpt != null && Number.isFinite(r.cpt) ? fmt(r.cpt, 2) : '—'}
                    </td>
                    <td className="creator-score-num">{fmt(r.sumViews, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="creator-score-table-legend">
          <strong>Score</strong> = weighted blend. <strong>E·C·Eff·I</strong> = 0–100 sub-scores.{' '}
          <strong>Eng°</strong> = (Likes + 3×Saves) ÷ Views · <strong>Int°</strong> = Saves ÷ Views.
        </p>
      </section>

      <section className="card creator-score-method" aria-label="How creator score is calculated">
        <div className="creator-score-method-bar">
          <span className="creator-score-method-icon" aria-hidden>
            ℹ️
          </span>
          <div className="creator-score-method-compact">
            <p className="creator-score-method-one-liner">
              <strong>Content score</strong> = 0.25×Engagement + 0.35×Conversion + 0.25×Efficiency +
              0.15×Intent
            </p>
            <div className="creator-score-formula-chips" role="list">
              <span className="creator-score-chip" role="listitem">
                Engagement <span className="creator-score-chip-math">(L + 3S) / V</span>
              </span>
              <span className="creator-score-chip" role="listitem">
                Intent <span className="creator-score-chip-math">S / V</span>
              </span>
              <span className="creator-score-chip" role="listitem">
                Conversion <span className="creator-score-chip-math">sales ÷ V</span>
              </span>
              <span className="creator-score-chip" role="listitem">
                Efficiency <span className="creator-score-chip-math">1 − norm(CPT)</span>
              </span>
            </div>
            <p className="creator-score-method-fine">
              CPT = cost ÷ sales when both exist; else efficiency uses a neutral midpoint. L/S/V and
              sales come from latest metrics + mapped sales where names match.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
