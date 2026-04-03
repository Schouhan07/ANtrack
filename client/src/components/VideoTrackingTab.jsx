import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiDownload, FiPlus, FiPlay, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { fetchDashboardKpis, fetchLatestMetrics } from '../services/api';
import VideoTrackingFilters, { INITIAL_TRACKING_FILTERS } from './VideoTrackingFilters';

const PAGE_SIZE = 8;

function fmtCount(n) {
  return Math.max(0, Number(n) || 0).toLocaleString();
}

function engagementPct(row) {
  const v = Math.max(1, Number(row.views) || 0);
  const eng = (Number(row.likes) || 0) + (Number(row.shares) || 0) + (Number(row.saves) || 0);
  return ((eng / v) * 100).toFixed(2);
}

function shareRate(row) {
  const v = Math.max(1, Number(row.views) || 0);
  return `${(((Number(row.shares) || 0) / v) * 100).toFixed(1)}%`;
}

function saveRate(row) {
  const v = Math.max(1, Number(row.views) || 0);
  return `${(((Number(row.saves) || 0) / v) * 100).toFixed(1)}%`;
}

function parseFilterNum(s) {
  if (s === '' || s == null) return null;
  const n = parseFloat(String(s).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function inNumericRange(val, minStr, maxStr) {
  const min = parseFilterNum(minStr);
  const max = parseFilterNum(maxStr);
  if (min != null && val < min) return false;
  if (max != null && val > max) return false;
  return true;
}

function portfolioViewsGrowthPct(kpis) {
  return kpis?.portfolio?.pctChange?.views;
}

function viewsGrowthLabel(kpis) {
  const vg = portfolioViewsGrowthPct(kpis);
  if (vg == null || vg === '') return '—';
  return `${Number(vg) >= 0 ? '+' : ''}${vg}%`;
}

function CreatorAvatar({ name }) {
  const initials = String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return <div className="video-tracking-creator-avatar">{initials || '?'}</div>;
}

function KpiCard({ label, value, sub, tone }) {
  return (
    <div className={`stat-card stat-card--compact stat-card--${tone}`}>
      <div className="stat-card-accent" aria-hidden />
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function VideoTrackingTab() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(() => ({ ...INITIAL_TRACKING_FILTERS }));

  const patchFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchDashboardKpis(), fetchLatestMetrics()])
      .then(([kpiRes, latest]) => {
        setKpis(kpiRes.data);
        setRows(latest.data || []);
      })
      .catch(() => {
        toast.error('Could not load video metrics');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const onUp = () => load();
    window.addEventListener('videos-updated', onUp);
    return () => window.removeEventListener('videos-updated', onUp);
  }, [load]);

  const filteredRows = useMemo(() => {
    const qv = filters.video.trim().toLowerCase();
    const qc = filters.creator.trim().toLowerCase();
    const qcamp = filters.campaign.trim().toLowerCase();
    return rows.filter((r) => {
      const v = r.video || {};
      const url = (r.url || v.url || '').toLowerCase();
      const title = (v.influencerName || v.creator || '').toLowerCase();
      if (qv && !`${url} ${title}`.includes(qv)) return false;
      const creator = (v.influencerName || v.creator || '').toLowerCase();
      if (qc && !creator.includes(qc)) return false;
      const camp = (v.campaign || '').toLowerCase();
      if (qcamp && !camp.includes(qcamp)) return false;
      const views = Number(r.views) || 0;
      if (!inNumericRange(views, filters.viewsMin, filters.viewsMax)) return false;
      const eng = parseFloat(engagementPct(r));
      if (!inNumericRange(eng, filters.engagementMin, filters.engagementMax)) return false;
      const shares = Number(r.shares) || 0;
      if (!inNumericRange(shares, filters.sharesMin, filters.sharesMax)) return false;
      const saves = Number(r.saves) || 0;
      if (!inNumericRange(saves, filters.savesMin, filters.savesMax)) return false;
      return true;
    });
  }, [rows, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const sliceStart = (pageClamped - 1) * PAGE_SIZE;
  const pageRows = useMemo(
    () => filteredRows.slice(sliceStart, sliceStart + PAGE_SIZE),
    [filteredRows, sliceStart]
  );

  useEffect(() => {
    setPage(1);
  }, [rows.length, filters]);

  const clearFilters = useCallback(() => {
    setFilters({ ...INITIAL_TRACKING_FILTERS });
  }, []);

  const exportCsv = () => {
    if (!filteredRows.length) {
      toast.error('No data to export');
      return;
    }
    const headers = [
      'url',
      'creator',
      'campaign',
      'platform',
      'views',
      'likes',
      'shares',
      'saves',
      'engagement_pct',
    ];
    const lines = filteredRows.map((r) => {
      const v = r.video || {};
      const url = (r.url || v.url || '').replace(/"/g, '""');
      const creator = (v.influencerName || v.creator || '').replace(/"/g, '""');
      const camp = (v.campaign || '').replace(/"/g, '""');
      const plat = (v.platform || '').replace(/"/g, '""');
      return `"${url}","${creator}","${camp}","${plat}",${r.views},${r.likes},${r.shares},${r.saves || 0},${engagementPct(r)}`;
    });
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `video-tracking-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('CSV downloaded');
  };

  const downloadPerformanceReport = () => {
    if (!filteredRows.length) {
      toast.error('No data to include in the report');
      return;
    }
    const vg = portfolioViewsGrowthPct(kpis);
    const growthLine =
      vg == null || vg === ''
        ? '—'
        : `${Number(vg) >= 0 ? '+' : ''}${vg}% vs last run`;
    const generated = new Date().toISOString();
    const out = [];
    out.push('VIDEO PERFORMANCE REPORT');
    out.push(`Generated (UTC): ${generated}`);
    out.push('');
    out.push('SUMMARY (same basis as Dashboard Summary)');
    if (kpis) {
      out.push(`  Total videos: ${fmtCount(kpis.totalVideosActive)}`);
      out.push(
        `  Total views: ${kpis.portfolio?.latest != null ? fmtCount(kpis.portfolio.latest.views) : '—'}`
      );
      out.push(`  Avg engagement rate: ${kpis.avgEngagementPct != null ? `${kpis.avgEngagementPct}%` : '—'}`);
      out.push(`  Views growth: ${growthLine}`);
    } else {
      out.push('  (KPIs unavailable)');
    }
    out.push('');
    out.push('VIDEOS');
    filteredRows.forEach((r, i) => {
      const v = r.video || {};
      const url = (r.url || v.url || '').trim();
      const creator = v.influencerName || v.creator || '—';
      const camp = v.campaign || '—';
      out.push(`  ${i + 1}. ${creator}`);
      out.push(`     Campaign: ${camp}`);
      out.push(`     URL: ${url || '—'}`);
      out.push(
        `     Views: ${fmtCount(r.views)} | Engagement: ${engagementPct(r)}% | Shares: ${fmtCount(r.shares)} | Saves: ${fmtCount(r.saves || 0)}`
      );
    });
    const blob = new Blob([out.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `video-performance-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Report downloaded');
  };

  return (
    <div className="video-tracking">
      <div className="video-tracking-header">
        <div>
          <h2 className="video-tracking-title">Video performance tracking</h2>
          <p className="video-tracking-lead muted-caption">
            Analyze engagement across tracked TikTok and Instagram posts.
          </p>
        </div>
        <div className="video-tracking-header-actions">
          <button type="button" className="btn btn-secondary video-tracking-btn-icon" onClick={exportCsv}>
            <FiDownload size={16} />
            Export CSV
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={downloadPerformanceReport}
          >
            <FiPlus size={16} />
            New report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="stats-row stats-row-overview">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card stat-card-skeleton" aria-hidden />
          ))}
        </div>
      ) : (
        <div className="stats-row stats-row video-tracking-kpis">
          <KpiCard
            tone="videos"
            label="Total videos"
            value={kpis != null ? fmtCount(kpis.totalVideosActive) : '—'}
          />
          <KpiCard
            tone="views"
            label="Total views"
            value={
              kpis?.portfolio?.latest != null
                ? fmtCount(kpis.portfolio.latest.views)
                : '—'
            }
          />
          <KpiCard
            tone="engagement"
            label="Avg engagement"
            value={kpis?.avgEngagementPct != null ? `${kpis.avgEngagementPct}%` : '—'}
            sub="(Likes + shares + saves + comments) ÷ views, latest run totals"
          />
          <KpiCard
            tone="growth"
            label="Views growth"
            value={viewsGrowthLabel(kpis)}
            sub="vs last run (same basis as Summary)"
          />
        </div>
      )}

      {!loading && rows.length > 0 && (
        <VideoTrackingFilters
          filters={filters}
          onFilterChange={patchFilter}
          onClear={clearFilters}
        />
      )}

      <div className="video-tracking-table-card">
        <div className="table-wrap video-tracking-table-wrap">
          <table className="video-tracking-table">
            <thead>
              <tr>
                <th>Video</th>
                <th>Creator</th>
                <th>Campaign</th>
                <th className="video-tracking-th-num">Views</th>
                <th className="video-tracking-th-num">Engagement</th>
                <th className="video-tracking-th-num">Shares</th>
                <th className="video-tracking-th-num">Saves</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="video-tracking-empty">
                    No metrics yet. Add videos and run a scrape.
                  </td>
                </tr>
              )}
              {!loading && rows.length > 0 && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="video-tracking-empty">
                    No videos match your filters. Try adjusting or clear filters.
                  </td>
                </tr>
              )}
              {pageRows.map((r) => {
                const v = r.video || {};
                const rowKey = String(r._id);
                const title =
                  (v.influencerName || v.creator || 'Video').slice(0, 48) ||
                  'Untitled';
                const creatorName = v.influencerName || v.creator || '—';
                return (
                  <tr
                    key={rowKey}
                    className="video-tracking-row"
                    onClick={() => navigate(`/video/${r._id}`)}
                  >
                    <td>
                      <div className="video-tracking-video-cell">
                        <div className="video-tracking-thumb">
                          <FiPlay className="video-tracking-thumb-play" size={18} />
                        </div>
                        <div>
                          <div className="video-tracking-title-cell">{title}</div>
                          <div className="video-tracking-meta-row">
                            {v.platform && (
                              <span className={`badge badge-${v.platform}`}>{v.platform}</span>
                            )}
                            <span className="video-tracking-url-hint">
                              {(r.url || v.url || '').slice(0, 42)}
                              {(r.url || v.url || '').length > 42 ? '…' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="video-tracking-creator-cell">
                        <CreatorAvatar name={creatorName} />
                        <span>{creatorName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="video-tracking-campaign">{v.campaign || '—'}</span>
                    </td>
                    <td className="video-tracking-num">{fmtCount(r.views)}</td>
                    <td className="video-tracking-num">
                      <span className="video-tracking-eng-rate">{engagementPct(r)}%</span>
                      <div className="video-tracking-sub-num">{fmtCount(r.likes)} likes</div>
                    </td>
                    <td className="video-tracking-num">
                      <span>{fmtCount(r.shares)}</span>
                      <div className="video-tracking-sub-num">{shareRate(r)}</div>
                    </td>
                    <td className="video-tracking-num">
                      <span className="video-tracking-saves">{fmtCount(r.saves)}</span>
                      <div className="video-tracking-sub-num video-tracking-sub-num--coral">
                        {saveRate(r)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRows.length > 0 && (
          <div className="video-tracking-pagination">
            <span className="muted-caption video-tracking-page-info">
              Showing{' '}
              <strong>
                {sliceStart + 1} – {Math.min(sliceStart + PAGE_SIZE, filteredRows.length)}
              </strong>{' '}
              of {filteredRows.length}
              {filteredRows.length !== rows.length ? ` (filtered from ${rows.length})` : ''} videos
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
        )}
      </div>
    </div>
  );
}
