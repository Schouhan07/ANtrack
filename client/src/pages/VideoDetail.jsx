import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { fetchMetricsByVideo, fetchVideoById } from '../services/api';

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '—';
  }
}

export default function VideoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState([]);
  const [video, setVideo] = useState(null);

  useEffect(() => {
    const loadVideoDoc = () => {
      fetchVideoById(id)
        .then((res) => setVideo(res.data))
        .catch(() => setVideo(null));
    };

    const loadMetrics = () => {
      fetchMetricsByVideo(id, 90)
        .then((res) => {
          const sorted = res.data.sort(
            (a, b) => new Date(a.scrapedAt) - new Date(b.scrapedAt)
          );
          setMetrics(sorted);
        })
        .catch(console.error);
    };

    loadVideoDoc();
    loadMetrics();

    const onVideosUpdated = (e) => {
      const touched = e.detail?.id;
      if (!touched || String(touched) === String(id)) {
        loadVideoDoc();
        loadMetrics();
      }
    };
    window.addEventListener('videos-updated', onVideosUpdated);
    return () => window.removeEventListener('videos-updated', onVideosUpdated);
  }, [id]);

  const chartData = metrics.map((m) => ({
    date: new Date(m.scrapedAt).toLocaleDateString(),
    views: m.views,
    likes: m.likes,
    shares: m.shares,
    saves: m.saves || 0,
  }));

  return (
    <div>
      <button className="btn btn-secondary mb-20" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <h1 style={{ marginBottom: 8 }}>Video Detail</h1>
      {video && (
        <>
          <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 16 }}>
            {(video.influencerName || video.creator) && (
              <strong>{video.influencerName || video.creator}</strong>
            )}
            {video.campaign && <> &middot; {video.campaign}</>}
            {' — '}
            <a href={video.url} target="_blank" rel="noopener noreferrer">
              {video.url}
            </a>
          </p>
          <div className="card video-detail-meta" style={{ marginBottom: 24 }}>
            <div className="card-header">
              <h2>Post details</h2>
            </div>
            <dl className="video-detail-meta-dl">
              <div>
                <dt>Created By</dt>
                <dd>{video.createdBy || '—'}</dd>
              </div>
              <div>
                <dt>Publish Date</dt>
                <dd>{fmtDate(video.publishDate)}</dd>
              </div>
              <div>
                <dt>Influencer Name</dt>
                <dd>{video.influencerName || '—'}</dd>
              </div>
              <div>
                <dt>Influencer Handle</dt>
                <dd>{video.influencerHandle || '—'}</dd>
              </div>
              <div>
                <dt>Platform</dt>
                <dd>{video.platform || '—'}</dd>
              </div>
              <div>
                <dt>LOB</dt>
                <dd>{video.lob || '—'}</dd>
              </div>
              <div>
                <dt>Video Duration</dt>
                <dd>{video.videoDuration || '—'}</dd>
              </div>
              <div>
                <dt>Total Cost</dt>
                <dd>
                  {video.totalCost != null && video.totalCost !== ''
                    ? Number(video.totalCost).toLocaleString()
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Coupon code used</dt>
                <dd>{video.offerCode || '—'}</dd>
              </div>
              <div>
                <dt>Initiated by</dt>
                <dd>{video.initiatedBy === 'supply' ? 'Supply' : 'Brand'}</dd>
              </div>
            </dl>
          </div>
        </>
      )}

      {chartData.length > 0 ? (
        <div className="card">
          <div className="card-header"><h2>Metrics Over Time</h2></div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="views" stroke="#e94560" strokeWidth={2} />
              <Line type="monotone" dataKey="likes" stroke="#0f3460" strokeWidth={2} />
              <Line type="monotone" dataKey="shares" stroke="#16c79a" strokeWidth={2} />
              <Line type="monotone" dataKey="saves" stroke="#f5a623" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card empty-state">No metrics found for this video.</div>
      )}

      {metrics.length > 0 && (
        <div className="card mt-20">
          <div className="card-header"><h2>Metrics Log</h2></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Views</th>
                  <th>Likes</th>
                  <th>Shares</th>
                  <th>Saves</th>
                  <th>Viral</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m._id}>
                    <td>{new Date(m.scrapedAt).toLocaleDateString()}</td>
                    <td>{Number(m.views).toLocaleString()}</td>
                    <td>{Number(m.likes).toLocaleString()}</td>
                    <td>{Number(m.shares).toLocaleString()}</td>
                    <td>{Number(m.saves || 0).toLocaleString()}</td>
                    <td>
                      {m.viral && (
                        <span className="badge badge-viral">VIRAL</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
