import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Dashboard from './Dashboard';
import BulkUpload from './BulkUpload';
import VideoDetail from './VideoDetail';
import VideosList from './VideosList';
import CampaignManager from './CampaignManager';
import CreatorOfferMappings from './CreatorOfferMappings';
import VideoTrackingPage from './VideoTrackingPage';
import CreatorsPage from './CreatorsPage';
import Analytics from './Analytics';
import PersonasPage from './PersonasPage';
import SentimentAnalysisPage from './SentimentAnalysisPage';
import { fetchTenantsMeta } from '../services/api';

const SIDEBAR_LS_KEY = 'antrack_sidebar_expanded';

export default function TenantShell() {
  const { tenant } = useParams();
  const navigate = useNavigate();
  const [valid, setValid] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try {
      const v = localStorage.getItem(SIDEBAR_LS_KEY);
      if (v === null) return false;
      return v === 'true';
    } catch {
      return false;
    }
  });

  const setSidebarOpen = (open) => {
    setSidebarExpanded(open);
    try {
      localStorage.setItem(SIDEBAR_LS_KEY, String(open));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await fetchTenantsMeta();
        const ids = new Set((data.tenants || []).map((t) => t.id));
        if (cancelled) return;
        if (!ids.has(tenant)) {
          setValid(false);
          return;
        }
        const raw = localStorage.getItem('antrack_user');
        const user = raw ? JSON.parse(raw) : null;
        if (user && user.role !== 'super_admin' && !(user.tenantIds || []).includes(tenant)) {
          if (user.tenantIds?.[0]) {
            navigate(`/${user.tenantIds[0]}`, { replace: true });
            return;
          }
          navigate('/login', { replace: true });
          return;
        }
        setValid(true);
      } catch {
        if (!cancelled) setValid(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant, navigate]);

  if (valid === null) {
    return (
      <div className={`app-layout ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        <Navbar expanded={sidebarExpanded} onToggleExpanded={() => setSidebarOpen(!sidebarExpanded)} />
        <main className="main-content">
          <p className="muted-caption" style={{ padding: 24 }}>
            Loading workspace…
          </p>
        </main>
      </div>
    );
  }

  if (valid === false) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={`app-layout ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <Navbar expanded={sidebarExpanded} onToggleExpanded={() => setSidebarOpen(!sidebarExpanded)} />
      <main className="main-content">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="overview" element={<Navigate to="" replace />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="personas" element={<PersonasPage />} />
          <Route path="video-tracking" element={<VideoTrackingPage />} />
          <Route path="creators" element={<CreatorsPage />} />
          <Route path="campaigns" element={<CampaignManager />} />
          <Route path="videos" element={<VideosList />} />
          <Route path="upload" element={<BulkUpload />} />
          <Route path="creator-offers" element={<CreatorOfferMappings />} />
          <Route path="sentiment-analysis" element={<SentimentAnalysisPage />} />
          <Route path="video/:id" element={<VideoDetail />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </main>
    </div>
  );
}
