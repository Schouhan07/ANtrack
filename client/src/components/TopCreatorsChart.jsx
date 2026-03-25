import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchTopCreators } from '../services/api';

export default function TopCreatorsChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchTopCreators()
      .then((res) => setData(res.data))
      .catch(console.error);
  }, []);

  if (data.length === 0) {
    return (
      <div className="card card-chart">
        <div className="card-header"><h2>Top Creators</h2></div>
        <div className="empty-state empty-state--soft">
          <span className="empty-state-icon" aria-hidden>
            🏆
          </span>
          <p>No creator data yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-chart">
      <div className="card-header">
        <h2>Top Performing Creators</h2>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="creator"
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip />
          <Bar
            dataKey="views"
            fill="url(#barGradient)"
            radius={[0, 8, 8, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
