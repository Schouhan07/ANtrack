import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantPath } from '../hooks/useTenantPath';
import { FiChevronLeft, FiChevronRight, FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import { fetchLatestMetrics } from '../services/api';

const PAGE_SIZE = 10;

function DeltaCell({ delta }) {
  if (delta == null) {
    return (
      <span className="metric-delta-pill metric-delta-pill--na" title="No prior scrape to compare">
        <span className="metric-delta-pill__text">—</span>
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span className="metric-delta-pill metric-delta-pill--flat" title="No change vs prior run">
        <FiMinus size={12} strokeWidth={2.5} aria-hidden />
        <span className="metric-delta-pill__text">0</span>
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={`metric-delta-pill ${up ? 'metric-delta-pill--up' : 'metric-delta-pill--down'}`}
      title={`${up ? 'Up' : 'Down'} vs prior run`}
    >
      {up ? (
        <FiTrendingUp size={12} strokeWidth={2.5} aria-hidden />
      ) : (
        <FiTrendingDown size={12} strokeWidth={2.5} aria-hidden />
      )}
      <span className="metric-delta-pill__text">
        {up ? '+' : ''}
        {Number(delta).toLocaleString()}
      </span>
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
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { withTenant } = useTenantPath();

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

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const sliceStart = (pageClamped - 1) * PAGE_SIZE;
  const pageRows = useMemo(
    () => rows.slice(sliceStart, sliceStart + PAGE_SIZE),
    [rows, sliceStart]
  );

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

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
          <p className="influencer-table-lead video-performance-lead">
            Δ columns show the change vs the previous scrape (views, likes, shares, saves).
          </p>
        </div>
      </div>

      <div className="video-performance-table-shell">
        <div className="table-wrap video-performance-table-wrap">
          <table className="video-performance-table">
            <thead>
              <tr>
                <th>Video URL</th>
                <th>Influencer</th>
                <th>Handle</th>
                <th>Created By</th>
                <th>LOB</th>
                <th>Coupon</th>
                <th>Initiated by</th>
                <th>Campaign</th>
                <th>Platform</th>
                <th>Views</th>
                <th className="video-performance-th-delta">Δ Views</th>
                <th>Likes</th>
                <th className="video-performance-th-delta">Δ Likes</th>
                <th>Shares</th>
                <th className="video-performance-th-delta">Δ Shares</th>
                <th>Saves</th>
                <th className="video-performance-th-delta">Δ Saves</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr
                  key={r._id}
                  className="video-performance-row"
                  onClick={() => navigate(withTenant(`/video/${r._id}`))}
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
                  <td>{r.video?.influencerName || r.video?.creator || '—'}</td>
                  <td>{r.video?.influencerHandle || '—'}</td>
                  <td>{r.video?.createdBy || '—'}</td>
                  <td>{r.video?.lob || '—'}</td>
                  <td>{r.video?.offerCode || '—'}</td>
                  <td>
                    <span className="badge badge-initiated badge-initiated--subtle">
                      {initiatedLabel(r.video?.initiatedBy)}
                    </span>
                  </td>
                  <td>{r.video?.campaign || '—'}</td>
                  <td>
                    {r.video?.platform && (
                      <span className={`badge badge-${r.video.platform}`}>{r.video.platform}</span>
                    )}
                  </td>
                  <td className="video-performance-num">{fmtCount(r.views)}</td>
                  <td className="video-performance-delta-cell">
                    <DeltaCell delta={r.delta?.views} />
                  </td>
                  <td className="video-performance-num">{fmtCount(r.likes)}</td>
                  <td className="video-performance-delta-cell">
                    <DeltaCell delta={r.delta?.likes} />
                  </td>
                  <td className="video-performance-num">{fmtCount(r.shares)}</td>
                  <td className="video-performance-delta-cell">
                    <DeltaCell delta={r.delta?.shares} />
                  </td>
                  <td className="video-performance-num">{fmtCount(r.saves)}</td>
                  <td className="video-performance-delta-cell">
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

        <div className="video-tracking-pagination">
          <span className="muted-caption video-tracking-page-info">
            Showing{' '}
            <strong>
              {sliceStart + 1} – {Math.min(sliceStart + PAGE_SIZE, rows.length)}
            </strong>{' '}
            of {rows.length} videos
          </span>
          <div className="video-tracking-page-btns">
            <button
              type="button"
              className="video-tracking-page-btn"
              disabled={pageClamped <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <FiChevronLeft size={18} />
            </button>
            <span className="video-tracking-page-label">
              Page {pageClamped} of {totalPages}
            </span>
            <button
              type="button"
              className="video-tracking-page-btn"
              disabled={pageClamped >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
