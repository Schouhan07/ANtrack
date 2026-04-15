import React, { useCallback, useEffect, useState } from 'react';
import { fetchPlatformAnalytics } from '../services/api';

function Stat({ label, value, sub }) {
  return (
    <div className="analytics-stat">
      <div className="analytics-stat-label">{label}</div>
      <div className="analytics-stat-value">{value}</div>
      {sub != null && sub !== '' && <div className="analytics-stat-sub">{sub}</div>}
    </div>
  );
}

function PlatformPanel({ title, subtitle, icon, theme, data }) {
  if (!data) return null;
  const { videoCount, totalViews, totalLikes, totalShares, totalSaves, avgEngagementRate, topCreator } =
    data;

  return (
    <section className={`analytics-platform analytics-platform--${theme}`} aria-label={title}>
      <div className="analytics-platform-head">
        <span className="analytics-platform-icon" aria-hidden>
          {icon}
        </span>
        <div>
          <h2 className="analytics-platform-title">{title}</h2>
          <p className="analytics-platform-sub">{subtitle}</p>
        </div>
      </div>

      <div className="analytics-platform-stats">
        <Stat label="Tracked videos" value={videoCount.toLocaleString()} />
        <Stat label="Total views" value={totalViews.toLocaleString()} />
        <Stat label="Total likes" value={totalLikes.toLocaleString()} />
        <Stat label="Shares" value={totalShares.toLocaleString()} />
        <Stat label="Saves" value={totalSaves.toLocaleString()} />
        <Stat
          label="Avg engagement"
          value={`${avgEngagementRate}%`}
          sub="(likes + shares + saves) ÷ views"
        />
      </div>

      <div className="analytics-platform-footer">
        <span className="analytics-platform-footer-label">Top creator by views</span>
        {topCreator ? (
          <span className="analytics-platform-footer-value">
            {topCreator.name}{' '}
            <span className="analytics-platform-footer-views">
              · {Number(topCreator.views).toLocaleString()} views
            </span>
          </span>
        ) : (
          <span className="analytics-platform-footer-muted">—</span>
        )}
      </div>
    </section>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    fetchPlatformAnalytics()
      .then((res) => setData(res.data))
      .catch((e) => setError(e.response?.data?.error || e.message));
  }, []);

  useEffect(() => {
    load();
    const onVideosUpdated = () => load();
    window.addEventListener('videos-updated', onVideosUpdated);
    return () => window.removeEventListener('videos-updated', onVideosUpdated);
  }, [load]);

  return (
    <div className="page-analytics">
      <div className="page-header page-header--hero">
        <div className="page-header-titles">
          <h1>Platform analytics</h1>
          <p className="page-subtitle">
            Performance split by network — URL decides Instagram vs TikTok (same as dashboard filters).
            Totals use the latest scrape per video; tracked video counts include posts not scraped yet.
          </p>
        </div>
      </div>

      {error && (
        <div className="card analytics-error">
          <p>{error}</p>
        </div>
      )}

      {!data && !error && (
        <div className="analytics-skeleton-row">
          <div className="analytics-skeleton-card" />
          <div className="analytics-skeleton-card" />
        </div>
      )}

      {data && (
        <div className="analytics-grid">
          <PlatformPanel
            title="Instagram"
            subtitle="Reels & posts you track"
            theme="instagram"
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            }
            data={data.instagram}
          />
          <PlatformPanel
            title="TikTok"
            subtitle="Videos you track"
            theme="tiktok"
            icon={
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            }
            data={data.tiktok}
          />
        </div>
      )}
    </div>
  );
}
