import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchLatestMetrics } from '../services/api';

function DeltaCell({ delta }) {
  if (delta == null) {
    return <span className="metric-delta metric-delta--na">—</span>;
  }
  if (delta === 0) {
    return <span className="metric-delta metric-delta--flat">0</span>;
  }
  const cls = delta > 0 ? 'metric-delta--up' : 'metric-delta--down';
  const sign = delta > 0 ? '+' : '';
  return (
    <span className={`metric-delta ${cls}`}>
      {sign}
      {Number(delta).toLocaleString()}
    </span>
  );
}

function initiatedLabel(v) {
  if (!v || v === 'brand') return 'Brand';
  if (v === 'supply') return 'Supply';
  return '—';
}

/** Absolute metrics (not Δ) — never show negative. */
function fmtCount(n) {
  return Math.max(0, Number(n) || 0).toLocaleString();
}

export default function VideoTable() {
  const [rows, setRows] = useState([]);
  const navigate = useNavigate();

  const loadRows = () => {
    fetchLatestMetrics()
      .then((res) => setRows(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    loadRows();
  }, []);

  useEffect(() => {
    const onVideosUpdated = () => loadRows();
    window.addEventListener('videos-updated', onVideosUpdated);
    return () => window.removeEventListener('videos-updated', onVideosUpdated);
  }, []);

  if (rows.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          No metrics yet. Add videos and run a scrape first.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>Video performance</h2>
          <p className="influencer-table-lead" style={{ marginTop: 6 }}>
            Δ columns compare this scrape to the previous run.
          </p>
        </div>
      </div>
      <div className="table-wrap video-performance-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Video URL</th>
              <th>Creator</th>
              <th>Initiated by</th>
              <th>Campaign</th>
              <th>Platform</th>
              <th>Views</th>
              <th>Δ Views</th>
              <th>Likes</th>
              <th>Δ Likes</th>
              <th>Shares</th>
              <th>Δ Shares</th>
              <th>Saves</th>
              <th>Δ Saves</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r._id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/video/${r._id}`)}
              >
                <td className="url-cell">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {r.url}
                  </a>
                </td>
                <td>{r.video?.creator || '—'}</td>
                <td>
                  <span className="badge badge-initiated badge-initiated--subtle">
                    {initiatedLabel(r.video?.initiatedBy)}
                  </span>
                </td>
                <td>{r.video?.campaign || '—'}</td>
                <td>
                  {r.video?.platform && (
                    <span className={`badge badge-${r.video.platform}`}>
                      {r.video.platform}
                    </span>
                  )}
                </td>
                <td>{fmtCount(r.views)}</td>
                <td>
                  <DeltaCell delta={r.delta?.views} />
                </td>
                <td>{fmtCount(r.likes)}</td>
                <td>
                  <DeltaCell delta={r.delta?.likes} />
                </td>
                <td>{fmtCount(r.shares)}</td>
                <td>
                  <DeltaCell delta={r.delta?.shares} />
                </td>
                <td>{fmtCount(r.saves)}</td>
                <td>
                  <DeltaCell delta={r.delta?.saves} />
                </td>
                <td>
                  {r.viral && <span className="badge badge-viral">VIRAL</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
