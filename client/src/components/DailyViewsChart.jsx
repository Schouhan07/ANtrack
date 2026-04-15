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
        const formatted = (res.data || []).map((d) => ({
          date: d._id,
          views: d.totalViews,
          likes: d.totalLikes,
          interpolated: d.interpolated === true,
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
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf1" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={8} />
          <YAxis tick={{ fontSize: 11 }} width={48} tickMargin={6} />
          <Tooltip
            formatter={(value, name, item) => {
              const carry = item?.payload?.interpolated ? ' (carried forward)' : '';
              const label = name === 'views' ? 'Views' : 'Likes';
              return [`${Number(value).toLocaleString()}${carry}`, label];
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="views"
            stroke="#f43f5e"
            strokeWidth={2.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            isAnimationActive={false}
            dot={(p) =>
              p.payload?.interpolated || p.cx == null ? null : (
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={3.5}
                  fill="#f43f5e"
                  stroke="#fff"
                  strokeWidth={1.2}
                />
              )
            }
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="likes"
            stroke="#6366f1"
            strokeWidth={2.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            isAnimationActive={false}
            dot={(p) =>
              p.payload?.interpolated || p.cx == null ? null : (
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={3.5}
                  fill="#6366f1"
                  stroke="#fff"
                  strokeWidth={1.2}
                />
              )
            }
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
