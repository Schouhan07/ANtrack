import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiMoreHorizontal, FiZap, FiArrowRight } from 'react-icons/fi';
import { fetchTopCreators } from '../services/api';

function fmtViews(n) {
  if (n == null) return '—';
  const v = Number(n);
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M views`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}k views`;
  return `${v.toLocaleString()} views`;
}

/** Engagement-style score 0–99 from views/likes. */
function creatorScore(views, likes) {
  const v = Number(views) || 0;
  const l = Number(likes) || 0;
  if (v <= 0) return 0;
  const eng = Math.min(99, Math.round((l / v) * 100));
  return Math.max(1, eng);
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
  return (
    <div className="dashboard-creator-avatar" aria-hidden>
      {initials || '?'}
    </div>
  );
}

export default function DashboardTopCreatorsInsight({ onViewAllCreators }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopCreators()
      .then((res) => setRows((res.data || []).slice(0, 5)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard-insight-row">
      <div className="dashboard-top-creators-card">
        <div className="dashboard-insight-card-head">
          <h3 className="dashboard-insight-card-title">Top Creators</h3>
          <button
            type="button"
            className="dashboard-insight-icon-btn"
            aria-label="More options"
          >
            <FiMoreHorizontal size={20} />
          </button>
        </div>

        <div className="dashboard-top-creators-list">
          {loading ? (
            <p className="muted-caption">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="muted-caption">Add videos and scrape to see top creators.</p>
          ) : (
            rows.map((creator, i) => (
              <div key={`${creator.creator}-${i}`} className="dashboard-creator-row">
                <div className="dashboard-creator-avatar-wrap">
                  <CreatorAvatar name={creator.creator} />
                  {i === 0 && (
                    <span className="dashboard-creator-rank-badge">#1</span>
                  )}
                </div>
                <div className="dashboard-creator-meta">
                  <p className="dashboard-creator-name">{creator.creator}</p>
                  <p className="dashboard-creator-sub">
                    {creator.videos} video{creator.videos !== 1 ? 's' : ''} · {fmtViews(creator.views)}
                  </p>
                </div>
                <div className="dashboard-creator-score-pill">
                  <span className="dashboard-creator-score-num">
                    {creatorScore(creator.views, creator.likes)}
                  </span>
                  <span className="dashboard-creator-score-label">Score</span>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          className="btn dashboard-view-all-btn"
          onClick={onViewAllCreators}
        >
          View all talent
        </button>
      </div>

      <div className="dashboard-ai-insight-card">
        <div className="dashboard-ai-insight-deco" aria-hidden>
          <span className="dashboard-ai-sparkle">✨</span>
        </div>

        <div className="dashboard-ai-insight-body">
          <div className="dashboard-ai-insight-heading">
            <div className="dashboard-ai-icon-wrap">
              <FiZap size={16} />
            </div>
            <h3 className="dashboard-ai-insight-title">AI Strategy Insight</h3>
          </div>

          <div className="dashboard-ai-blocks">
            <div className="dashboard-ai-observation">
              <p className="dashboard-ai-kicker">Observation</p>
              <p className="dashboard-ai-lead">
                Micro-influencers in lifestyle are peaking
              </p>
              <p className="dashboard-ai-copy">
                Saturation in high-tier talent is driving audience fatigue, while lifestyle micros are
                maintaining 2.4× retention rates.
              </p>
            </div>
            <div className="dashboard-ai-mini-grid">
              <div className="dashboard-ai-mini-tile">
                <p className="dashboard-ai-mini-label">Reason</p>
                <p className="dashboard-ai-mini-value dashboard-ai-mini-value--secondary">
                  15% lower CPM
                </p>
              </div>
              <div className="dashboard-ai-mini-tile">
                <p className="dashboard-ai-mini-label">Impact</p>
                <p className="dashboard-ai-mini-value dashboard-ai-mini-value--primary">
                  Expected +10% ROI
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-ai-footer">
          <div className="dashboard-ai-recommendation">
            <p className="dashboard-ai-rec-label">Recommendation</p>
            <p className="dashboard-ai-rec-text">
              Shift 20% budget to lifestyle micro-influencers immediately.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary dashboard-ai-deploy-btn"
            onClick={() => toast('Strategy tools coming soon.')}
          >
            <span>Deploy strategy</span>
            <FiArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
