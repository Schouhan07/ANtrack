import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoTrackingTab from '../components/VideoTrackingTab';
import DashboardTabNav, {
  dashboardTabFromSearchParam,
  DASHBOARD_TAB_SUBTITLES,
} from '../components/DashboardTabNav';

const VT_TAB_PARAM = 'vt';

export default function VideoTrackingPage() {
  const [searchParams] = useSearchParams();
  const navTab = useMemo(
    () => dashboardTabFromSearchParam(searchParams, VT_TAB_PARAM),
    [searchParams]
  );
  const subtitle =
    navTab === 'summary'
      ? 'Per-video metrics, filters, and export.'
      : DASHBOARD_TAB_SUBTITLES[navTab] || DASHBOARD_TAB_SUBTITLES.summary;

  return (
    <div className="page-dashboard page-overview">
      <div className="page-header page-header--hero">
        <div className="page-header-titles">
          <h1>Video tracking</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>

      <DashboardTabNav linkSearchParam={VT_TAB_PARAM} selectedTabId={navTab} />

      <div className="dashboard-tab-panels-region">
        <VideoTrackingTab />
      </div>
    </div>
  );
}
