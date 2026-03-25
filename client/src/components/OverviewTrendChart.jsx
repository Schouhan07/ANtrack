import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { fetchWeeklyTrend } from '../services/api';

export default function OverviewTrendChart({ weeks = 8 }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchWeeklyTrend(weeks)
      .then((res) => setData(res.data))
      .catch(console.error);
  }, [weeks]);

  if (data.length === 0) {
    return (
      <div className="card card-chart">
        <div className="card-header">
          <h2>Views &amp; engagement trend</h2>
          <span className="muted-caption">Last {weeks} weeks</span>
        </div>
        <div className="empty-state empty-state--soft">
          <span className="empty-state-icon" aria-hidden>
            📈
          </span>
          <p>No weekly data yet — run a scrape to see trends.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-chart">
      <div className="card-header">
        <h2>Views &amp; engagement trend</h2>
        <span className="muted-caption">Last {weeks} weeks (by scrape activity)</span>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : v)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : v)}
          />
          <Tooltip
            formatter={(value, name) => [
              typeof value === 'number' ? value.toLocaleString() : value,
              name === 'views' ? 'Views' : 'Engagement',
            ]}
          />
          <Legend
            formatter={(value) => (value === 'views' ? 'Views' : 'Engagement (likes + shares + saves)')}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="views"
            stroke="#f43f5e"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="engagement"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
