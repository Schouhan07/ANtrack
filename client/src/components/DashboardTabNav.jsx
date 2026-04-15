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

/** Creators page only — Summary + score + lookalikes (no dashboard metrics tabs). */
export const CREATORS_TABS = [
  { id: 'summary', label: 'Summary', icon: '📊' },
  { id: 'creator-score', label: 'Creator score', icon: '⭐' },
  { id: 'lookalike', label: 'Lookalike creators', icon: '🔮' },
];

export const DASHBOARD_TAB_SUBTITLES = {
  summary: 'Portfolio KPIs, trends, and charts in one place.',
  metrics: 'Daily breakdown and latest vs previous scrape comparison.',
  working: 'Daily views and top creators across your roster.',
  why: 'Gemini AI insights from your live portfolio metrics.',
  actions: 'Recommended next steps (coming soon).',
  performance: 'Scrape fresh metrics and review per-video performance.',
};

export const CREATORS_TAB_SUBTITLES = {
  summary: 'Roster performance and influencer insights.',
  'creator-score': 'Top creators by weighted content score (engagement, conversion, efficiency, intent).',
  lookalike: 'Reserved for future lookalike discovery.',
};

/** Read a dashboard-style tab id from a URLSearchParams-like object (e.g. `?cr=creator-score`). */
export function dashboardTabFromSearchParam(
  searchParams,
  paramName,
  tabs = DASHBOARD_TABS
) {
  if (!paramName) return 'summary';
  const t = searchParams.get(paramName);
  if (t && tabs.some((x) => x.id === t)) return t;
  return 'summary';
}

/**
 * Same tab strip as Dashboard.
 * `linkSearchParam`: stay on current route; set/clear this query key (e.g. `cr` on creators).
 */
export default function DashboardTabNav({
  selectedTabId,
  onTabSelect,
  linkSearchParam,
  tabs = DASHBOARD_TABS,
}) {
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
        {tabs.map((tab) => (
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
