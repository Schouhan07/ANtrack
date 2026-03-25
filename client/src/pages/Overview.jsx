import React, { useState } from 'react';
import CampaignOverview from '../components/CampaignOverview';
import OverviewTrendChart from '../components/OverviewTrendChart';
import DailyViewsChart from '../components/DailyViewsChart';
import TopCreatorsChart from '../components/TopCreatorsChart';
import InfluencerInsightsTab from '../components/InfluencerInsightsTab';
import DataMetricsTab from '../components/DataMetricsTab';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'metrics', label: 'Data Metrics', icon: '📈' },
  { id: 'working', label: "What's Working", icon: '🚀' },
  { id: 'why', label: 'Why It Works', icon: '🧠' },
  { id: 'creators', label: 'Creators', icon: '👤' },
  { id: 'actions', label: 'Actions', icon: '⚡' },
];

export default function Overview() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="page-overview">
      <div className="page-header page-header--hero">
        <div className="page-header-titles">
          <h1>Overview</h1>
          <p className="page-subtitle">KPIs, trends, and insight tabs in one place</p>
        </div>
      </div>

      <div className="dashboard-tabs">
        <div className="dashboard-tabs-bar" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`dashboard-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="dashboard-tab-icon" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="dashboard-tab-panels">
          {activeTab === 'overview' && (
            <section className="dashboard-tab-panel" aria-label="Overview">
              <CampaignOverview />
              <OverviewTrendChart weeks={8} />
            </section>
          )}

          {activeTab === 'metrics' && (
            <section className="dashboard-tab-panel" aria-label="Data Metrics">
              <DataMetricsTab />
            </section>
          )}

          {activeTab === 'working' && (
            <section className="dashboard-tab-panel" aria-label="What's Working">
              <div className="charts-row">
                <DailyViewsChart />
                <TopCreatorsChart />
              </div>
            </section>
          )}

          {activeTab === 'why' && (
            <section className="dashboard-tab-panel placeholder-panel" aria-label="Why It Works">
              <div className="card placeholder-card">
                <span className="placeholder-card-icon" aria-hidden>
                  🧠
                </span>
                <p className="placeholder-panel-text">
                  Gemini-powered breakdowns will go here (hooks, formats, pacing).
                </p>
              </div>
            </section>
          )}

          {activeTab === 'creators' && (
            <section className="dashboard-tab-panel" aria-label="Creators">
              <InfluencerInsightsTab />
            </section>
          )}

          {activeTab === 'actions' && (
            <section className="dashboard-tab-panel placeholder-panel" aria-label="Actions">
              <div className="card placeholder-card">
                <span className="placeholder-card-icon" aria-hidden>
                  ⚡
                </span>
                <p className="placeholder-panel-text">
                  Recommended next steps — wire up Gemini for prioritized actions.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
