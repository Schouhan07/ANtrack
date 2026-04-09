import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiRefreshCw } from 'react-icons/fi';
import { fetchAiInsights } from '../services/api';

export default function AiInsightsTab() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [model, setModel] = useState(null);
  const [empty, setEmpty] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState('');
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [contextMismatch, setContextMismatch] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFromCache(false);
    setContextMismatch(false);
    try {
      const res = await fetchAiInsights();
      const d = res.data;
      if (d.empty) {
        setInsights([]);
        setEmpty(true);
        setEmptyMessage(d.message || 'No data yet.');
        setGeneratedAt(d.generatedAt || null);
        setModel(null);
        return { empty: true, fromCache: false };
      }
      setEmpty(false);
      setInsights(Array.isArray(d.insights) ? d.insights : []);
      setGeneratedAt(d.generatedAt || null);
      setModel(d.model || null);
      if (d.fromCache) {
        setFromCache(true);
        setContextMismatch(!!d.contextMismatch);
      }
      return { empty: false, fromCache: !!d.fromCache };
    } catch (e) {
      const msg =
        e.response?.data?.error ||
        e.message ||
        'Could not load AI insights';
      setError(msg);
      setInsights([]);
      return { empty: false, fromCache: false };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    toast.promise(load(), {
      loading: 'Refreshing insights…',
      success: (meta) =>
        meta?.fromCache ? 'Loaded saved insights (live AI unavailable)' : 'Insights updated',
      error: (err) =>
        err.response?.data?.error || err.message || 'Refresh failed',
    });
  };

  return (
    <section className="dashboard-tab-panel ai-insights" aria-label="AI insights">
      <div className="ai-insights-header">
        <div>
          <h2>Why it works</h2>
          {/* <p className="ai-insights-lead">
            Pattern → comparison → recommendation. Generated from your live metrics with Gemini; numbers are grounded in
            the current portfolio snapshot.
          </p> */}
          {generatedAt && (
            <p className="ai-insights-meta">
              Last generated: {new Date(generatedAt).toLocaleString()}
              {model ? ` · ${model}` : ''}
              {fromCache ? ' · Cached' : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={loading}
          onClick={handleRefresh}
        >
          <FiRefreshCw size={16} className={loading ? 'spin-icon' : ''} aria-hidden />
          Refresh
        </button>
      </div>

      {fromCache && insights.length > 0 && (
        <div className="ai-insights-cache-banner" role="status">
          <strong>Cached insights</strong>
          <span>
            {' '}
            Live AI did not respond; showing the last successful run
            {generatedAt ? ` (${new Date(generatedAt).toLocaleString()})` : ''}.
            {contextMismatch &&
              ' Your portfolio may have changed since these were generated.'}
          </span>
        </div>
      )}

      {loading && insights.length === 0 && !error && (
        <div className="stats-row stats-row-overview">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card stat-card-skeleton" aria-hidden style={{ minHeight: 120 }} />
          ))}
        </div>
      )}

      {error && (
        <div className="ai-insights-error" role="alert">
          {error}
          {error.includes('GEMINI_API_KEY') || error.includes('503') ? (
            <span>
              {' '}
              Add <code>GEMINI_API_KEY</code> to <code>server/.env</code> and restart the API.
            </span>
          ) : null}
        </div>
      )}

      {!loading && empty && !error && (
        <div className="card ai-insights-empty">{emptyMessage}</div>
      )}

      {!error && insights.length > 0 && (
        <div className="ai-insights-grid">
          {insights.map((item, idx) => (
            <article key={idx} className="ai-insight-card">
              <h3>{item.insight}</h3>
              <div className="ai-insight-block">
                <p className="ai-insight-kicker">Reason</p>
                <p className="ai-insight-body ai-insight-body--muted">{item.reason}</p>
              </div>
              <div className="ai-insight-block">
                <p className="ai-insight-kicker">Recommendation</p>
                <p className="ai-insight-body">{item.recommendation}</p>
              </div>
              <div className="ai-insight-block">
                <p className="ai-insight-kicker">Expected impact</p>
                <p className="ai-insight-body ai-insight-body--muted">{item.expectedImpact}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
