import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Dashboard from './Dashboard';
import BulkUpload from './BulkUpload';
import VideoDetail from './VideoDetail';
import VideosList from './VideosList';
import CampaignManager from './CampaignManager';
import CreatorOfferMappings from './CreatorOfferMappings';
import Analytics from './Analytics';
import { fetchTenantsMeta } from '../services/api';

export default function TenantShell() {
  const { tenant } = useParams();
  const navigate = useNavigate();
  const [valid, setValid] = useState(null);

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
      <div className="app-layout">
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
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="overview" element={<Navigate to="" replace />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="campaigns" element={<CampaignManager />} />
          <Route path="videos" element={<VideosList />} />
          <Route path="upload" element={<BulkUpload />} />
          <Route path="creator-offers" element={<CreatorOfferMappings />} />
          <Route path="video/:id" element={<VideoDetail />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </main>
    </div>
  );
}
