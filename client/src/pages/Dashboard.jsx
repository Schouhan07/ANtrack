import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import VideoTable from '../components/VideoTable';
import CampaignOverview from '../components/CampaignOverview';
import OverviewTrendChart from '../components/OverviewTrendChart';
import DailyViewsChart from '../components/DailyViewsChart';
import TopCreatorsChart from '../components/TopCreatorsChart';
import InfluencerInsightsTab from '../components/InfluencerInsightsTab';
import DataMetricsTab from '../components/DataMetricsTab';
import DashboardTopCreatorsInsight from '../components/DashboardTopCreatorsInsight';
import VideoTrackingTab from '../components/VideoTrackingTab';
import AiInsightsTab from '../components/AiInsightsTab';
import { fetchDashboardKpis, triggerScrape } from '../services/api';

const TABS = [
  { id: 'summary', label: 'Summary', icon: '📊' },
  { id: 'video-tracking', label: 'Video Tracking', icon: '📹' },
  { id: 'metrics', label: 'Data Metrics', icon: '📈' },
  { id: 'working', label: "What's Working", icon: '🚀' },
  { id: 'why', label: 'Why It Works', icon: '🧠' },
  { id: 'creators', label: 'Creators', icon: '👤' },
  { id: 'actions', label: 'Actions', icon: '⚡' },
  { id: 'performance', label: 'Performance', icon: '🎬' },
];

const TAB_SUBTITLES = {
  summary: 'Portfolio KPIs, trends, and charts in one place.',
  'video-tracking': 'Track views, engagement, and performance across all monitored posts.',
  metrics: 'Daily breakdown and latest vs previous scrape comparison.',
  working: 'Daily views and top creators across your roster.',
  why: 'Gemini AI insights from your live portfolio metrics.',
  creators: 'Per-creator performance and drill-downs.',
  actions: 'Recommended next steps (coming soon).',
  performance: 'Scrape fresh metrics and review per-video performance.',
};

function fmtInt(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString();
}

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function GrowthBlock({ pct }) {
  const p = pct == null || pct === '' ? null : Number(pct);
  if (p == null || Number.isNaN(p)) {
    return (
      <div className="stat-sub stat-sub--growth">
        <span className="stat-growth-na">—</span>
      </div>
    );
  }
  const up = p >= 0;
  return (
    <div className="stat-sub stat-sub--growth">
      <span className={up ? 'stat-growth-up' : 'stat-growth-down'}>
        {up ? '↑' : '↓'} {Math.abs(p)}% vs last run
      </span>
    </div>
  );
}

function NewVideosGrowthBlock({ last7, prior7 }) {
  const l = Number(last7) || 0;
  const p = Number(prior7) || 0;
  let pct = null;
  if (p > 0) {
    pct = ((l - p) / p) * 100;
  } else if (l > 0 && p === 0) {
    pct = 100;
  }

  if (pct == null || Number.isNaN(pct)) {
    return (
      <div className="stat-sub stat-sub--growth">
        <span className="stat-sub-dim">Growth</span>
        <span className="stat-growth-na">—</span>
      </div>
    );
  }
  const up = pct >= 0;
  const rounded = Math.abs(Number(pct.toFixed(1)));
  return (
    <div className="stat-sub stat-sub--growth">
      <span className="stat-sub-dim">Growth</span>
      <span className={up ? 'stat-growth-up' : 'stat-growth-down'}>
        {up ? '↑' : '↓'} {rounded}% vs prior 7d
      </span>
    </div>
  );
}

function DashboardKpiSection({ kpis, loadingKpis, port, pct }) {
  return (
    <section className="dashboard-kpi-section" aria-label="Key metrics">
      {loadingKpis ? (
        <div className="stats-row stats-row-dashboard-kpi">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="stat-card stat-card--compact stat-card-skeleton" aria-hidden />
          ))}
        </div>
      ) : (
        <div className="stats-row stats-row-dashboard-kpi">
          <div className="stat-card stat-card--compact stat-card--videos">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Total videos</div>
            <div className="value">{fmtInt(kpis?.totalVideosActive)}</div>
            <div className="stat-sub" />
            <NewVideosGrowthBlock
              last7={kpis?.videosNewLast7d}
              prior7={kpis?.videosNewPrior7d}
            />
          </div>

          <div className="stat-card stat-card--compact stat-card--views">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Total views</div>
            <div className="value">{fmtInt(port?.latest?.views)}</div>
            <GrowthBlock pct={pct?.views} />
          </div>

          <div className="stat-card stat-card--compact stat-card--likes">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Likes</div>
            <div className="value">{fmtInt(port?.latest?.likes)}</div>
            <GrowthBlock pct={pct?.likes} />
          </div>

          <div className="stat-card stat-card--compact stat-card--comments">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Comments</div>
            <div className="value">{fmtInt(port?.latest?.comments)}</div>
            <GrowthBlock pct={pct?.comments} />
          </div>

          <div className="stat-card stat-card--compact stat-card--shares">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Shares</div>
            <div className="value">{fmtInt(port?.latest?.shares)}</div>
            <GrowthBlock pct={pct?.shares} />
          </div>

          <div className="stat-card stat-card--compact stat-card--saves">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Saves</div>
            <div className="value">{fmtInt(port?.latest?.saves)}</div>
            <GrowthBlock pct={pct?.saves} />
          </div>

          <div className="stat-card stat-card--compact stat-card--engagement">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Avg engagement</div>
            <div className="value accent">
              {kpis?.avgEngagementPct != null ? `${kpis.avgEngagementPct}%` : '—'}
            </div>
            {/* <div className="stat-sub">
              (Likes + shares + saves + comments) ÷ views, latest run totals
            </div> */}
          </div>

          <div className="stat-card stat-card--compact stat-card--ppv">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Pay per view</div>
            <div className="value">
              {kpis?.payPerView != null ? `$${fmtMoney(kpis.payPerView)}` : '—'}
            </div>
            {/* <div className="stat-sub">
              Sum of Total Cost on active videos ÷ latest portfolio views
            </div> */}
          </div>

          <div className="stat-card stat-card--compact stat-card--txn">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Transactions</div>
            <div className="value">{fmtInt(kpis?.transactionsTotal)}</div>
            {/* <div className="stat-sub">
              Sum of Sales on tracked videos
              {kpis?.transactionsVideos != null && kpis.transactionsVideos > 0
                ? ` · ${kpis.transactionsVideos} video${kpis.transactionsVideos !== 1 ? 's' : ''} with sales`
                : ''}
            </div> */}
          </div>
        </div>
      )}

      {kpis?.portfolio && kpis.portfolio.videosCompared === 0 && kpis.totalVideosActive > 0 && (
        <p className="dashboard-kpi-footnote muted-caption">
          Run comparison (growth %) appears after each active video has at least two scrapes.
        </p>
      )}
    </section>
  );
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  const loadKpis = () => {
    setLoadingKpis(true);
    fetchDashboardKpis()
      .then((res) => setKpis(res.data))
      .catch(() => {
        toast.error('Could not load dashboard metrics');
      })
      .finally(() => setLoadingKpis(false));
  };

  useEffect(() => {
    loadKpis();
    const onVideosUpdated = () => loadKpis();
    window.addEventListener('videos-updated', onVideosUpdated);
    return () => window.removeEventListener('videos-updated', onVideosUpdated);
  }, []);

  const handleScrapeNow = async () => {
    setScraping(true);
    try {
      const res = await triggerScrape();
      toast.success(`Scraped ${res.data.scraped} videos`);
      setTimeout(() => {
        loadKpis();
        window.dispatchEvent(new CustomEvent('videos-updated', { detail: {} }));
      }, 800);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Scrape failed');
    } finally {
      setScraping(false);
    }
  };

  const port = kpis?.portfolio;
  const pct = port?.pctChange;
  const subtitle = TAB_SUBTITLES[activeTab] || TAB_SUBTITLES.summary;

  return (
    <>
      <div className="page-dashboard page-overview">
        <div className="page-header page-header--hero">
          <div className="page-header-titles">
            <h1>Dashboard</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>
        </div>

        <div className="dashboard-tabs dashboard-tabs--top-bar dashboard-tabs--before-page">
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
        </div>

        {activeTab === 'summary' && (
          <>
            <DashboardKpiSection
              kpis={kpis}
              loadingKpis={loadingKpis}
              port={port}
              pct={pct}
            />
            <DashboardTopCreatorsInsight
              onViewAllCreators={() => setActiveTab('creators')}
              onOpenFullInsights={() => setActiveTab('why')}
            />
            <div className="dashboard-tab-panels-region">
              <div className="dashboard-tab-panels">
                <section className="dashboard-tab-panel" aria-label="Summary">
                  <CampaignOverview />
                  <OverviewTrendChart weeks={8} />
                </section>
              </div>
            </div>
          </>
        )}

        {activeTab === 'video-tracking' && (
          <div className="dashboard-tab-panels-region">
            <VideoTrackingTab />
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="dashboard-tab-panels-region">
            <DataMetricsTab />
          </div>
        )}

        {activeTab === 'working' && (
          <div className="dashboard-tab-panels-region">
            <section className="dashboard-tab-panel" aria-label="What's Working">
              <div className="charts-row">
                <DailyViewsChart />
                <TopCreatorsChart />
              </div>
            </section>
          </div>
        )}

        {activeTab === 'why' && (
          <div className="dashboard-tab-panels-region">
            <AiInsightsTab />
          </div>
        )}

        {activeTab === 'creators' && (
          <div className="dashboard-tab-panels-region">
            <section className="dashboard-tab-panel" aria-label="Creators">
              <InfluencerInsightsTab />
            </section>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="dashboard-tab-panels-region placeholder-panel">
            <div className="card placeholder-card">
              <span className="placeholder-card-icon" aria-hidden>
                ⚡
              </span>
              <p className="placeholder-panel-text">
                Recommended next steps — wire up Gemini for prioritized actions.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="dashboard-tab-panels-region">
            <section className="dashboard-tab-panel" aria-label="Performance">
              <div className="dashboard-performance-head">
                <p className="page-subtitle" style={{ margin: 0 }}>
                  Scrape fresh metrics and review per-video performance (Δ vs previous run).
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={scraping}
                  onClick={handleScrapeNow}
                >
                  {scraping ? 'Scraping…' : 'Scrape now'}
                </button>
              </div>
              <VideoTable />
            </section>
          </div>
        )}
      </div>
    </>
  );
}
