import React, { useEffect, useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { fetchDailyBreakdown, fetchPortfolioRunComparison } from '../services/api';

const RANGE_OPTIONS = [
  { label: '7 d', value: 7 },
  { label: '14 d', value: 14 },
];

const METRIC_DEFS = [
  { key: 'views', label: 'Views', color: '#f43f5e', fill: 'rgba(244,63,94,0.08)' },
  { key: 'likes', label: 'Likes', color: '#6366f1', fill: 'rgba(99,102,241,0.08)' },
  { key: 'shares', label: 'Shares', color: '#06b6d4', fill: 'rgba(6,182,212,0.08)' },
  { key: 'saves', label: 'Saves', color: '#8b5cf6', fill: 'rgba(139,92,246,0.08)' },
  { key: 'engagement', label: 'Engagement', color: '#10b981', fill: 'rgba(16,185,129,0.08)' },
];

const SUMMARY_KEYS = ['views', 'likes', 'shares', 'saves'];

function fmt(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}k`;
  return String(Math.round(v));
}

function fmtShortDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function DataMetricsTab() {
  const [data, setData] = useState([]);
  const [runComparison, setRunComparison] = useState(null);
  const [days, setDays] = useState(7);
  const [visible, setVisible] = useState({
    views: true,
    likes: true,
    shares: true,
    saves: true,
    engagement: false,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchDailyBreakdown(days), fetchPortfolioRunComparison()])
      .then(([breakdownRes, runRes]) => {
        setData(breakdownRes.data || []);
        setRunComparison(runRes.data || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onVideosUpdated = () => load();
    window.addEventListener('videos-updated', onVideosUpdated);
    return () => window.removeEventListener('videos-updated', onVideosUpdated);
  }, [load]);

  const toggleMetric = (key) =>
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));

  const latest = runComparison?.latest;
  const previous = runComparison?.previous;
  const pctChange = runComparison?.pctChange;
  const videosCompared = runComparison?.videosCompared ?? 0;

  if (loading) {
    return (
      <div className="card card-chart data-metrics-card">
        <div className="influencer-table-skeleton">
          {[1, 2, 3].map((i) => (
            <div key={i} className="influencer-skel-row" />
          ))}
        </div>
      </div>
    );
  }

  const hasChart = data.length > 0;
  const hasRunSummary = latest && videosCompared > 0;
  const nothingAtAll = !hasChart && !hasRunSummary;

  if (nothingAtAll) {
    return (
      <div className="card card-chart data-metrics-card">
        <div className="empty-state empty-state--soft">
          <span className="empty-state-icon" aria-hidden>
            📈
          </span>
          <p>No metrics yet — add videos and run a scrape (twice per video to compare runs).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-metrics-wrapper">
      {hasRunSummary && (
        <div className="data-metrics-summary-block">
          <p className="data-metrics-run-caption muted-caption">
            Portfolio totals summed over <strong>{videosCompared}</strong> active video
            {videosCompared !== 1 ? 's' : ''} with at least two scrapes. Headline = latest run;
            % = change vs previous run.
            {latest?.scrapedAt && previous?.scrapedAt && (
              <>
                {' '}
                Latest: {fmtShortDate(latest.scrapedAt)} · Previous:{' '}
                {fmtShortDate(previous.scrapedAt)}
              </>
            )}
          </p>
          <div className="data-metrics-summary-row">
            {SUMMARY_KEYS.map((m) => {
              const val = latest[m];
              const pct = pctChange?.[m];
              const up = pct !== null && pct !== undefined && Number(pct) >= 0;
              return (
                <div key={m} className="data-metrics-summary-card">
                  <div className="data-metrics-summary-label">
                    {METRIC_DEFS.find((d) => d.key === m)?.label || m}
                  </div>
                  <div className="data-metrics-summary-value">{fmt(val)}</div>
                  <div className="data-metrics-summary-unit">latest run total</div>
                  {pct !== null && pct !== undefined && (
                    <div
                      className={`data-metrics-summary-delta ${up ? 'delta-up' : 'delta-down'}`}
                    >
                      {up ? '↑' : '↓'} {Math.abs(Number(pct))}%
                      <span className="data-metrics-summary-vs"> vs last run</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasRunSummary && hasChart && (
        <p className="muted-caption data-metrics-run-caption" style={{ marginBottom: 12 }}>
          Run comparison appears after each active video has at least two scrapes.
        </p>
      )}

      <div className="card card-chart data-metrics-card">
        <div className="card-header">
          <div>
            <h2>Growth comparison</h2>
            <p className="muted-caption">
              7-day or 14-day window only. Each point = one daily portfolio total (latest scrape per
              video that day). Same scale as Dashboard — not a sum across days.
            </p>
          </div>
          <div className="data-metrics-range">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`data-metrics-range-btn ${days === opt.value ? 'active' : ''}`}
                onClick={() => setDays(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {!hasChart ? (
          <div className="empty-state empty-state--soft" style={{ padding: '32px 24px' }}>
            <p>No daily points in this window yet.</p>
          </div>
        ) : (
          <>
            <div className="data-metrics-toggles">
              {METRIC_DEFS.map((m) => (
                <label
                  key={m.key}
                  className={`data-metrics-toggle ${visible[m.key] ? 'active' : ''}`}
                  style={{ '--toggle-color': m.color }}
                >
                  <input
                    type="checkbox"
                    checked={!!visible[m.key]}
                    onChange={() => toggleMetric(m.key)}
                  />
                  <span
                    className="data-metrics-toggle-dot"
                    style={{ background: m.color }}
                  />
                  {m.label}
                </label>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={380}>
              <AreaChart data={data} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
                <defs>
                  {METRIC_DEFS.map((m) => (
                    <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={m.color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => {
                    const parts = d.split('-');
                    return `${parts[1]}/${parts[2]}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={fmt} />
                <Tooltip
                  formatter={(value, name) => [
                    typeof value === 'number' ? value.toLocaleString() : value,
                    METRIC_DEFS.find((mm) => mm.key === name)?.label || name,
                  ]}
                  labelFormatter={(d) => {
                    const date = new Date(d);
                    return date.toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    });
                  }}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 8px 24px rgba(15,23,42,.12)',
                    fontSize: '0.82rem',
                  }}
                />
                <Legend
                  formatter={(value) =>
                    METRIC_DEFS.find((mm) => mm.key === value)?.label || value
                  }
                />
                {METRIC_DEFS.map(
                  (m) =>
                    visible[m.key] && (
                      <Area
                        key={m.key}
                        type="monotone"
                        dataKey={m.key}
                        stroke={m.color}
                        strokeWidth={2.5}
                        fill={`url(#grad-${m.key})`}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    )
                )}
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}
