import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const DASHBOARD_TABS = [
  { id: 'summary', label: 'Summary', icon: '📊' },
  { id: 'metrics', label: 'Data Metrics', icon: '📈' },
  { id: 'working', label: "What's Working", icon: '🚀' },
  { id: 'why', label: 'Why It Works', icon: '🧠' },
  { id: 'actions', label: 'Actions', icon: '⚡' },
  { id: 'performance', label: 'Performance', icon: '🎬' },
];

export const DASHBOARD_TAB_SUBTITLES = {
  summary: 'Portfolio KPIs, trends, and charts in one place.',
  metrics: 'Daily breakdown and latest vs previous scrape comparison.',
  working: 'Daily views and top creators across your roster.',
  why: 'Gemini AI insights from your live portfolio metrics.',
  actions: 'Recommended next steps (coming soon).',
  performance: 'Scrape fresh metrics and review per-video performance.',
};

/** Read a dashboard-style tab id from a URLSearchParams-like object (e.g. `?vt=metrics`). */
export function dashboardTabFromSearchParam(searchParams, paramName) {
  if (!paramName) return 'summary';
  const t = searchParams.get(paramName);
  if (t && DASHBOARD_TABS.some((x) => x.id === t)) return t;
  return 'summary';
}

/**
 * Same tab strip as Dashboard.
 * `linkSearchParam`: stay on current route; set/clear this query key (e.g. `vt` on video-tracking, `cr` on creators).
 */
export default function DashboardTabNav({ selectedTabId, onTabSelect, linkSearchParam }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (id) => {
    if (linkSearchParam) {
      const params = new URLSearchParams(location.search);
      if (id === 'summary') {
        params.delete(linkSearchParam);
      } else {
        params.set(linkSearchParam, id);
      }
      const qs = params.toString();
      navigate({ pathname: location.pathname, search: qs ? `?${qs}` : '' }, { replace: false });
      return;
    }
    if (onTabSelect) onTabSelect(id);
  };

  return (
    <div className="dashboard-tabs dashboard-tabs--top-bar dashboard-tabs--before-page">
      <div className="dashboard-tabs-bar" role="tablist">
        {DASHBOARD_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selectedTabId === tab.id}
            className={`dashboard-tab ${selectedTabId === tab.id ? 'active' : ''}`}
            onClick={() => handleClick(tab.id)}
          >
            <span className="dashboard-tab-icon" aria-hidden>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
