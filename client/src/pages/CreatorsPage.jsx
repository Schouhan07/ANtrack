import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import InfluencerInsightsTab from '../components/InfluencerInsightsTab';
import DashboardTabNav, {
  dashboardTabFromSearchParam,
  DASHBOARD_TAB_SUBTITLES,
} from '../components/DashboardTabNav';

const CR_TAB_PARAM = 'cr';

export default function CreatorsPage() {
  const [searchParams] = useSearchParams();
  const navTab = useMemo(
    () => dashboardTabFromSearchParam(searchParams, CR_TAB_PARAM),
    [searchParams]
  );
  const subtitle =
    navTab === 'summary'
      ? 'Roster performance and influencer insights.'
      : DASHBOARD_TAB_SUBTITLES[navTab] || DASHBOARD_TAB_SUBTITLES.summary;

  return (
    <div className="page-dashboard page-overview">
      <div className="page-header page-header--hero">
        <div className="page-header-titles">
          <h1>Creators</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      <DashboardTabNav linkSearchParam={CR_TAB_PARAM} selectedTabId={navTab} />

      <div className="dashboard-tab-panels-region">
        <section className="dashboard-tab-panel" aria-label="Creators">
          <InfluencerInsightsTab />
        </section>
      </div>
    </div>
  );
}
