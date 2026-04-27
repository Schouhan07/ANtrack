import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
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
import { fetchTenantsMeta, getAdminUser } from '../services/api';

const SIDEBAR_LS_KEY = 'antrack_sidebar_expanded';

/** @typedef {'loading' | 'ready' | 'unauthed' | 'boot_error'} WorkspaceGate */

const actingProfileResolved = new Map();
const actingProfileInflight = new Map();

/** One fetch per `asUser` id; dedupes concurrent TenantShell + Navbar calls. */
async function getActingUserProfile(asUser) {
  if (actingProfileResolved.has(asUser)) {
    return actingProfileResolved.get(asUser);
  }
  if (actingProfileInflight.has(asUser)) {
    return actingProfileInflight.get(asUser);
  }
  const p = getAdminUser(asUser)
    .then((r) => {
      const data = r.data || null;
      actingProfileResolved.set(asUser, data);
      actingProfileInflight.delete(asUser);
      return data;
    })
    .catch((err) => {
      actingProfileInflight.delete(asUser);
      throw err;
    });
  actingProfileInflight.set(asUser, p);
  return p;
}

export default function TenantShell() {
  const { tenant } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  /** @type {[WorkspaceGate, React.Dispatch<React.SetStateAction<WorkspaceGate>>]} */
  const [gate, setGate] = useState('loading');
  const [bootError, setBootError] = useState(null);
  const [retryNonce, setRetryNonce] = useState(0);
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
    setGate('loading');
    setBootError(null);

    (async () => {
      const token = localStorage.getItem('antrack_token');
      if (!token) {
        if (!cancelled) setGate('unauthed');
        return;
      }

      try {
        const params = new URLSearchParams(location.search || '');
        const asUser = String(params.get('asUser') || '').trim();
        const { data } = await fetchTenantsMeta();
        if (cancelled) return;
        const ids = new Set((data.tenants || []).map((t) => t.id));

        const raw = localStorage.getItem('antrack_user');
        let user = null;
        try {
          user = raw ? JSON.parse(raw) : null;
        } catch {
          user = null;
        }

        if (!ids.has(tenant)) {
          if (user?.role === 'super_admin') {
            navigate('/admin/applications', { replace: true });
            return;
          }
          if (user?.tenantIds?.[0]) {
            navigate(`/${user.tenantIds[0]}${location.search || ''}`, { replace: true });
            return;
          }
          if (!cancelled) setGate('unauthed');
          return;
        }

        if (user?.role === 'super_admin' && asUser) {
          let target;
          try {
            target = await getActingUserProfile(asUser);
          } catch {
            if (cancelled) return;
            navigate('/admin/users', { replace: true });
            return;
          }
          if (cancelled) return;
          const targetTenants = target?.tenantIds || [];
          if (!targetTenants.includes(tenant)) {
            if (targetTenants[0]) {
              navigate(`/${targetTenants[0]}?asUser=${encodeURIComponent(asUser)}`, { replace: true });
              return;
            }
            navigate('/admin/users', { replace: true });
            return;
          }
          setGate('ready');
          return;
        }

        if (user && user.role !== 'super_admin' && !(user.tenantIds || []).includes(tenant)) {
          if (user.tenantIds?.[0]) {
            navigate(`/${user.tenantIds[0]}${location.search || ''}`, { replace: true });
            return;
          }
          if (!cancelled) setGate('unauthed');
          return;
        }

        if (!cancelled) setGate('ready');
      } catch (err) {
        if (cancelled) return;
        const stillHasToken = localStorage.getItem('antrack_token');
        if (!stillHasToken) {
          setGate('unauthed');
          return;
        }
        setBootError(err?.message || 'Could not load workspace. Check your connection and try again.');
        setGate('boot_error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenant, navigate, location.search, retryNonce]);

  const handleBootRetry = () => {
    setBootError(null);
    setGate('loading');
    setRetryNonce((n) => n + 1);
  };

  if (gate === 'loading') {
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

  if (gate === 'unauthed') {
    return <Navigate to="/login" replace />;
  }

  if (gate === 'boot_error') {
    return (
      <div className={`app-layout ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        <Navbar expanded={sidebarExpanded} onToggleExpanded={() => setSidebarOpen(!sidebarExpanded)} />
        <main className="main-content">
          <div className="card" style={{ maxWidth: 480, padding: 24 }}>
            <h1 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Workspace unavailable</h1>
            <p className="muted-caption" style={{ marginBottom: 16 }}>
              {bootError}
            </p>
            <button type="button" className="btn btn-primary" onClick={handleBootRetry}>
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`app-layout ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <Navbar expanded={sidebarExpanded} onToggleExpanded={() => setSidebarOpen(!sidebarExpanded)} />
      <main className="main-content">
        {/* Remount workspace pages when tenant changes so data effects refetch (API uses URL tenant). */}
        <Routes key={tenant}>
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
