import React, { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchWeeklyTrend } from '../services/api';

/** Chart strokes (Recharts needs explicit colors) */
const CHART = {
  primary: '#a78bfa',
  secondary: '#38bdf8',
  grid: '#334155',
  axis: '#94a3b8',
  tooltipBg: '#0f172a',
  tooltipBorder: '#475569',
};

function formatNumber(num) {
  const n = Number(num) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

/** val is 0–1 engagement rate */
function formatPercent(val) {
  return `${((Number(val) || 0) * 100).toFixed(1)}%`;
}

export default function OverviewTrendChart({ weeks = 8 }) {
  const [raw, setRaw] = useState([]);

  useEffect(() => {
    fetchWeeklyTrend(weeks)
      .then((res) => setRaw(res.data || []))
      .catch(console.error);
  }, [weeks]);

  const data = useMemo(
    () =>
      raw.map((d) => ({
        ...d,
        engagementRate: d.views > 0 ? d.engagement / d.views : 0,
      })),
    [raw]
  );

  if (raw.length === 0) {
    return (
      <div className="overview-trend-chart">
        <div className="overview-trend-chart__head">
          <h2 className="overview-trend-chart__title">Trend analysis</h2>
          <p className="overview-trend-chart__lead">
            Views vs engagement rate (last {weeks} weeks)
          </p>
        </div>
        <div className="overview-trend-chart__empty empty-state empty-state--soft">
          <span className="empty-state-icon" aria-hidden>
            📈
          </span>
          <p>No weekly data yet — run a scrape to see trends.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overview-trend-chart">
      <div className="overview-trend-chart__head">
        <h2 className="overview-trend-chart__title">Trend analysis</h2>
        <p className="overview-trend-chart__lead">
          Views vs engagement rate (last {weeks} weeks, by scrape activity)
        </p>
        <div className="overview-trend-chart__legend" aria-hidden>
          <span className="overview-trend-chart__legend-item">
            <span className="overview-trend-chart__swatch overview-trend-chart__swatch--primary" />
            Views
          </span>
          <span className="overview-trend-chart__legend-item">
            <span className="overview-trend-chart__swatch overview-trend-chart__swatch--dashed" />
            Engagement rate
          </span>
        </div>
      </div>

      <div className="overview-trend-chart__plot">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="label"
              stroke={CHART.axis}
              tick={{ fontSize: 12, fill: CHART.axis }}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
            />
            <YAxis
              yAxisId="left"
              stroke={CHART.axis}
              tick={{ fontSize: 12, fill: CHART.axis }}
              tickFormatter={formatNumber}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
              width={48}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={CHART.axis}
              tick={{ fontSize: 12, fill: CHART.axis }}
              tickFormatter={formatPercent}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
              width={52}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: CHART.tooltipBg,
                border: `1px solid ${CHART.tooltipBorder}`,
                borderRadius: '10px',
                color: '#e2e8f0',
              }}
              labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
              formatter={(value, name) => {
                if (name === 'views') return [formatNumber(value), 'Views'];
                if (name === 'engagementRate') return [formatPercent(value), 'Engagement rate'];
                return [value, name];
              }}
              labelFormatter={(label) => String(label)}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="views"
              name="views"
              stroke={CHART.primary}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="engagementRate"
              name="engagementRate"
              stroke={CHART.secondary}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
