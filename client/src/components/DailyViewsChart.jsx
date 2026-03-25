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
import { fetchDailyViews } from '../services/api';

export default function DailyViewsChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchDailyViews(30)
      .then((res) => {
        const formatted = res.data.map((d) => ({
          date: d._id,
          views: d.totalViews,
          likes: d.totalLikes,
        }));
        setData(formatted);
      })
      .catch(console.error);
  }, []);

  if (data.length === 0) {
    return (
      <div className="card card-chart">
        <div className="card-header"><h2>Daily Views Trend</h2></div>
        <div className="empty-state empty-state--soft">
          <span className="empty-state-icon" aria-hidden>
            📉
          </span>
          <p>No data yet — add videos and scrape.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-chart">
      <div className="card-header">
        <h2>Daily Views Trend (30 days)</h2>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="views"
            stroke="#f43f5e"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="likes"
            stroke="#6366f1"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
