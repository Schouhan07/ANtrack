import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import InfluencerInsightsTab from '../components/InfluencerInsightsTab';
import CreatorScoreTab from '../components/CreatorScoreTab';
import LookalikeCreatorsTab from '../components/LookalikeCreatorsTab';
import DashboardTabNav, {
  dashboardTabFromSearchParam,
  CREATORS_TABS,
  CREATORS_TAB_SUBTITLES,
} from '../components/DashboardTabNav';

const CR_TAB_PARAM = 'cr';

export default function CreatorsPage() {
  const [searchParams] = useSearchParams();
  const navTab = useMemo(
    () => dashboardTabFromSearchParam(searchParams, CR_TAB_PARAM, CREATORS_TABS),
    [searchParams]
  );
  const subtitle = CREATORS_TAB_SUBTITLES[navTab] || CREATORS_TAB_SUBTITLES.summary;

  return (
    <div className="page-dashboard page-overview">
      <div className="page-header page-header--hero">
        <div className="page-header-titles">
          <h1>Creators</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      <DashboardTabNav
        tabs={CREATORS_TABS}
        linkSearchParam={CR_TAB_PARAM}
        selectedTabId={navTab}
      />

      <div className="dashboard-tab-panels-region">
        {navTab === 'summary' && (
          <section className="dashboard-tab-panel" aria-label="Summary">
            <InfluencerInsightsTab />
          </section>
        )}
        {navTab === 'creator-score' && (
          <section className="dashboard-tab-panel" aria-label="Creator score">
            <CreatorScoreTab />
          </section>
        )}
        {navTab === 'lookalike' && (
          <section className="dashboard-tab-panel" aria-label="Lookalike creators">
            <LookalikeCreatorsTab />
          </section>
        )}
      </div>
    </div>
  );
}
