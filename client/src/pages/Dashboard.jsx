import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTenantPath } from '../hooks/useTenantPath';
import DashboardTabNav, { DASHBOARD_TABS, DASHBOARD_TAB_SUBTITLES } from '../components/DashboardTabNav';
import VideoTable from '../components/VideoTable';
import CampaignOverview from '../components/CampaignOverview';
import OverviewTrendChart from '../components/OverviewTrendChart';
import DailyViewsChart from '../components/DailyViewsChart';
import TopCreatorsChart from '../components/TopCreatorsChart';
import DataMetricsTab from '../components/DataMetricsTab';
import DashboardTopCreatorsInsight from '../components/DashboardTopCreatorsInsight';
import AiInsightsTab from '../components/AiInsightsTab';
import { fetchDashboardKpis, triggerScrape } from '../services/api';

function tabFromSearchParams(searchParams) {
  const t = searchParams.get('tab');
  if (t && DASHBOARD_TABS.some((x) => x.id === t)) return t;
  return 'summary';
}

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
        {up ? '↑' : '↓'} {rounded}%
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
            <div className="value">3</div>
            {/* <div className="value">{fmtInt(kpis?.transactionsTotal)}</div> */}
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { withTenant } = useTenantPath();
  const [kpis, setKpis] = useState(null);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [kpiPlatform, setKpiPlatform] = useState('all');

  const activeTab = useMemo(() => tabFromSearchParams(searchParams), [searchParams]);

  const setActiveTab = useCallback(
    (id) => {
      if (id === 'summary') {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab: id }, { replace: true });
      }
    },
    [setSearchParams]
  );

  const loadKpis = useCallback(() => {
    setLoadingKpis(true);
    fetchDashboardKpis({ platform: kpiPlatform })
      .then((res) => setKpis(res.data))
      .catch(() => {
        toast.error('Could not load dashboard metrics');
      })
      .finally(() => setLoadingKpis(false));
  }, [kpiPlatform]);

  useEffect(() => {
    loadKpis();
    const onVideosUpdated = () => loadKpis();
    window.addEventListener('videos-updated', onVideosUpdated);
    return () => window.removeEventListener('videos-updated', onVideosUpdated);
  }, [loadKpis]);

  const handleScrapeNow = async () => {
    setScraping(true);
    try {
      const res = await triggerScrape();
      const { scraped, warnings = [], counts } = res.data;
      if (warnings.length > 0) {
        toast(warnings.join('\n'), { icon: '⚠️', duration: 10000 });
      }
      const q =
        counts != null
          ? ` (${counts.tiktok ?? 0} TikTok, ${counts.instagram ?? 0} Instagram in queue)`
          : '';
      toast.success(`Scraped ${scraped} metric row(s)${q}`);
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
  const subtitle = DASHBOARD_TAB_SUBTITLES[activeTab] || DASHBOARD_TAB_SUBTITLES.summary;

  return (
    <>
      <div className="page-dashboard page-overview">
        <div className="page-header page-header--hero">
          <div className="page-header-titles">
            <h1>Dashboard</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>
        </div>

        <DashboardTabNav selectedTabId={activeTab} onTabSelect={setActiveTab} />

        {activeTab === 'summary' && (
          <>
            <div className="dashboard-kpi-platform-bar">
              <span className="dashboard-kpi-platform-label">Platform</span>
              <div className="dashboard-kpi-platform-pills" role="group" aria-label="Filter KPIs by platform">
                {['all', 'tiktok', 'instagram', 'facebook'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn btn-sm ${kpiPlatform === p ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setKpiPlatform(p)}
                  >
                    {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <DashboardKpiSection
              kpis={kpis}
              loadingKpis={loadingKpis}
              port={port}
              pct={pct}
            />
            <DashboardTopCreatorsInsight
              platform={kpiPlatform}
              onViewAllCreators={() => navigate(withTenant('/creators'))}
              onOpenFullInsights={() => {
                setSearchParams({ tab: 'why' }, { replace: true });
              }}
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
