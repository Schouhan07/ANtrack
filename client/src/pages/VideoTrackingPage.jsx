import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import VideoTrackingTab from '../components/VideoTrackingTab';

export default function VideoTrackingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!searchParams.has('vt')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('vt');
    const qs = next.toString();
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : '' }, { replace: true });
  }, [searchParams, navigate, location.pathname]);

  return (
    <div className="page-dashboard page-overview">
      <div className="page-header page-header--hero">
        <div className="page-header-titles">
          <h1>Video tracking</h1>
          <p className="page-subtitle">Per-video metrics, filters, and export.</p>
        </div>
      </div>

      <div className="dashboard-tab-panels-region">
        <VideoTrackingTab />
      </div>
    </div>
  );
}
