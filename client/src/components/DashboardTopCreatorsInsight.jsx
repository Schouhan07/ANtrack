import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiMoreHorizontal, FiZap, FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import { fetchTopCreators, fetchAiInsights } from '../services/api';

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

function buildStrategyBrief(featured, generatedAt) {
  const date = generatedAt ? new Date(generatedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return [
    `STRATEGY BRIEF — ${date}`,
    '',
    `Insight: ${featured.insight}`,
    '',
    `Reason: ${featured.reason}`,
    '',
    `Recommendation: ${featured.recommendation}`,
    '',
    `Expected impact: ${featured.expectedImpact}`,
  ].join('\n');
}

/**
 * @param {() => void} onViewAllCreators — switch to Creators tab
 * @param {() => void} [onOpenFullInsights] — switch to Why it works (full Gemini list)
 */
export default function DashboardTopCreatorsInsight({ onViewAllCreators, onOpenFullInsights }) {
  const [rows, setRows] = useState([]);
  const [creatorsLoading, setCreatorsLoading] = useState(true);

  const [insights, setInsights] = useState([]);
  const [insightLoading, setInsightLoading] = useState(true);
  const [insightError, setInsightError] = useState(null);
  const [insightEmpty, setInsightEmpty] = useState(false);
  const [insightEmptyMessage, setInsightEmptyMessage] = useState('');
  const [insightGeneratedAt, setInsightGeneratedAt] = useState(null);
  const [insightModel, setInsightModel] = useState(null);
  const [insightFromCache, setInsightFromCache] = useState(false);
  const [insightContextMismatch, setInsightContextMismatch] = useState(false);

  const loadCreators = useCallback(() => {
    setCreatorsLoading(true);
    fetchTopCreators()
      .then((res) => setRows((res.data || []).slice(0, 5)))
      .catch(() => {})
      .finally(() => setCreatorsLoading(false));
  }, []);

  const loadInsights = useCallback(async () => {
    setInsightLoading(true);
    setInsightError(null);
    setInsightFromCache(false);
    setInsightContextMismatch(false);
    try {
      const res = await fetchAiInsights();
      const d = res.data;
      if (d.empty) {
        setInsights([]);
        setInsightEmpty(true);
        setInsightEmptyMessage(d.message || 'No portfolio data yet.');
        setInsightGeneratedAt(d.generatedAt || null);
        setInsightModel(null);
        return { empty: true, fromCache: false };
      }
      setInsightEmpty(false);
      setInsights(Array.isArray(d.insights) ? d.insights : []);
      setInsightGeneratedAt(d.generatedAt || null);
      setInsightModel(d.model || null);
      if (d.fromCache) {
        setInsightFromCache(true);
        setInsightContextMismatch(!!d.contextMismatch);
      }
      return { empty: false, fromCache: !!d.fromCache };
    } catch (e) {
      const msg =
        e.response?.data?.error || e.message || 'Could not load AI insights';
      setInsightError(msg);
      setInsights([]);
      setInsightEmpty(false);
      return { empty: false, fromCache: false };
    } finally {
      setInsightLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCreators();
    loadInsights();
    const onUp = () => {
      loadCreators();
      loadInsights();
    };
    window.addEventListener('videos-updated', onUp);
    return () => window.removeEventListener('videos-updated', onUp);
  }, [loadCreators, loadInsights]);

  const featured = insights[0] || null;
  const canDeploy = Boolean(featured && !insightLoading && !insightError);

  const handleRefreshInsight = () => {
    toast.promise(loadInsights(), {
      loading: 'Refreshing insight…',
      success: (meta) =>
        meta?.fromCache
          ? 'Loaded saved insight (live AI unavailable)'
          : 'Insight updated',
      error: (err) =>
        err.response?.data?.error || err.message || 'Refresh failed',
    });
  };

  const handleDeployStrategy = async () => {
    if (!featured) {
      toast.error('No insight to deploy yet');
      return;
    }
    const text = buildStrategyBrief(featured, insightGeneratedAt);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Strategy brief copied to clipboard');
      onOpenFullInsights?.();
    } catch {
      toast.error('Could not copy — select text manually or open Why it works');
      onOpenFullInsights?.();
    }
  };

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
          {creatorsLoading ? (
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
          <div className="dashboard-ai-insight-heading dashboard-ai-insight-heading--row">
            <div className="dashboard-ai-insight-heading-start">
              <div className="dashboard-ai-icon-wrap">
                <FiZap size={16} />
              </div>
              <h3 className="dashboard-ai-insight-title">Insight</h3>
            </div>
            <button
              type="button"
              className="dashboard-ai-insight-refresh"
              onClick={handleRefreshInsight}
              disabled={insightLoading}
              aria-label="Refresh AI insight"
            >
              <FiRefreshCw size={16} className={insightLoading ? 'dashboard-ai-refresh-spin' : ''} />
            </button>
          </div>

          {insightFromCache && featured && (
            <div className="dashboard-ai-spotlight-cache-banner" role="status">
              <strong>Cached</strong>
              <span>
                {' '}
                Live AI unavailable; showing last successful insight
                {insightGeneratedAt
                  ? ` (${new Date(insightGeneratedAt).toLocaleString()})`
                  : ''}.
                {insightContextMismatch &&
                  ' Metrics may have changed since this was generated.'}
              </span>
            </div>
          )}

          {insightLoading && !featured ? (
            <div className="dashboard-ai-spotlight-loading muted-caption">
              Generating insight from your metrics…
            </div>
          ) : insightError ? (
            <div className="dashboard-ai-spotlight-error" role="alert">
              {insightError}
              {(insightError.includes('GEMINI') || insightError.includes('503')) && (
                <span className="dashboard-ai-spotlight-error-hint">
                  {' '}
                  Set <code>GEMINI_API_KEY</code> in <code>server/.env</code> and restart the API.
                </span>
              )}
            </div>
          ) : insightEmpty ? (
            <p className="muted-caption dashboard-ai-spotlight-empty">{insightEmptyMessage}</p>
          ) : !featured ? (
            <p className="muted-caption dashboard-ai-spotlight-empty">
              No insights returned. Check Gemini configuration or tap refresh.
            </p>
          ) : (
            <>
              <div className="dashboard-ai-blocks">
                <div className="dashboard-ai-observation">
                  <p className="dashboard-ai-kicker">Insight</p>
                  <p className="dashboard-ai-lead dashboard-ai-dynamic-clamp-2">{featured.insight}</p>
                  <p className="dashboard-ai-copy dashboard-ai-dynamic-clamp-3">{featured.reason}</p>
                </div>
                <div className="dashboard-ai-mini-grid">
                  <div className="dashboard-ai-mini-tile">
                    <p className="dashboard-ai-mini-label">Expected impact</p>
                    <p className="dashboard-ai-mini-value dashboard-ai-mini-value--primary dashboard-ai-dynamic-clamp-2">
                      {featured.expectedImpact}
                    </p>
                  </div>
                  <div className="dashboard-ai-mini-tile">
                    <p className="dashboard-ai-mini-label">Source</p>
                    <p className="dashboard-ai-mini-value dashboard-ai-mini-value--secondary">
                      {insightFromCache ? 'Cached · ' : ''}
                      {insightModel || 'Gemini'}
                      {insightGeneratedAt && (
                        <>
                          <br />
                          <span className="dashboard-ai-mini-muted">
                            {new Date(insightGeneratedAt).toLocaleString()}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              {insights.length > 1 && onOpenFullInsights && (
                <button
                  type="button"
                  className="dashboard-ai-spotlight-link"
                  onClick={onOpenFullInsights}
                >
                  +{insights.length - 1} more in Why it works →
                </button>
              )}
            </>
          )}
        </div>

        <div className="dashboard-ai-footer">
          <div className="dashboard-ai-recommendation">
            <p className="dashboard-ai-rec-label">Recommendation</p>
            {featured ? (
              <p className="dashboard-ai-rec-text dashboard-ai-dynamic-clamp-3">{featured.recommendation}</p>
            ) : (
              <p className="dashboard-ai-rec-text muted-caption">
                {insightLoading
                  ? '…'
                  : 'Run a scrape and ensure Gemini is configured to see a live recommendation.'}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary dashboard-ai-deploy-btn"
            disabled={!canDeploy}
            title={
              canDeploy
                ? 'Copy strategy brief to clipboard and open full insights'
                : 'Insight not ready'
            }
            onClick={handleDeployStrategy}
          >
            <span>Deploy strategy</span>
            <FiArrowRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
