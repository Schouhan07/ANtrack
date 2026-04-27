import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTenantPath } from '../hooks/useTenantPath';
import { fetchTenantsMeta, getAdminUser } from '../services/api';
import {
  FiHome,
  FiUpload,
  FiList,
  FiActivity,
  FiBriefcase,
  FiTag,
  FiPieChart,
  FiUser,
  FiFilm,
  FiUsers,
  FiSmile,
  FiLayers,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';

/** Preserve path after first URL segment when switching workspace (country) tenant. */
function pathWithNewTenant(pathname, newTenantId) {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts.length === 0) return `/${newTenantId}`;
  const rest = parts.slice(1);
  return rest.length ? `/${newTenantId}/${rest.join('/')}` : `/${newTenantId}`;
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('antrack_user') || 'null');
  } catch {
    return null;
  }
}

export default function Navbar({ expanded = true, onToggleExpanded = () => {} }) {
  const { withTenant, asUser, tenant } = useTenantPath();
  const navigate = useNavigate();
  const location = useLocation();
  const [tenantsMeta, setTenantsMeta] = useState([]);
  const [actingProfile, setActingProfile] = useState(null);
  /** Bumped on cross-tab localStorage changes so we re-read `antrack_user`. */
  const [userRevision, setUserRevision] = useState(0);
  const actingProfileCacheRef = useRef({ asUserId: null, data: null });

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'antrack_user' || e.key === 'antrack_token') {
        setUserRevision((n) => n + 1);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const user = useMemo(
    () => readStoredUser(),
    [userRevision, location.pathname]
  );

  useEffect(() => {
    let cancelled = false;
    fetchTenantsMeta()
      .then((res) => {
        if (!cancelled) setTenantsMeta(res.data.tenants || []);
      })
      .catch(() => {
        if (!cancelled) setTenantsMeta([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (user?.role !== 'super_admin' || !asUser) {
      setActingProfile(null);
      actingProfileCacheRef.current = { asUserId: null, data: null };
      return;
    }
    const cached = actingProfileCacheRef.current;
    if (cached.asUserId === asUser && cached.data) {
      setActingProfile(cached.data);
      return;
    }
    let cancelled = false;
    getAdminUser(asUser)
      .then((res) => {
        if (cancelled) return;
        const data = res.data || null;
        actingProfileCacheRef.current = { asUserId: asUser, data };
        setActingProfile(data);
      })
      .catch(() => {
        if (!cancelled) {
          actingProfileCacheRef.current = { asUserId: asUser, data: null };
          setActingProfile(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role, asUser]);

  const tenantIdsForSwitch = useMemo(() => {
    if (user?.role === 'super_admin' && asUser && actingProfile?.tenantIds?.length) {
      return actingProfile.tenantIds;
    }
    if (user?.role !== 'super_admin' && Array.isArray(user?.tenantIds)) {
      return user.tenantIds;
    }
    return [];
  }, [user, asUser, actingProfile]);

  const showTenantSwitcher =
    tenantIdsForSwitch.length > 1 &&
    (user?.role !== 'super_admin' || Boolean(asUser));

  const tenantLabel = (id) => tenantsMeta.find((t) => t.id === id)?.label || id;

  const onWorkspaceChange = (e) => {
    const nextId = e.target.value;
    if (!nextId || nextId === tenant) return;
    const path = pathWithNewTenant(location.pathname, nextId);
    navigate(`${path}${location.search || ''}`, { replace: true });
  };

  const signOut = () => {
    localStorage.removeItem('antrack_token');
    localStorage.removeItem('antrack_user');
    navigate('/login', { replace: true });
  };

  return (
    <div className={`sidebar-outer ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
      <div className="sidebar-track">
        <nav id="tenant-main-nav" className="sidebar" aria-label="Main navigation">
          <div className="sidebar-scroll">
            <div className="sidebar-brand">
              <div className="sidebar-logo">
                AN<span>Track</span>
              </div>
              <p className="sidebar-tagline">Influencer intelligence</p>
            </div>

            {showTenantSwitcher && (
              <div className="sidebar-tenant-switch">
                <label htmlFor="sidebar-workspace-select" className="sidebar-tenant-switch-label">
                  Country / region
                </label>
                <select
                  id="sidebar-workspace-select"
                  className="sidebar-tenant-select"
                  value={tenantIdsForSwitch.includes(tenant) ? tenant : tenantIdsForSwitch[0]}
                  onChange={onWorkspaceChange}
                  aria-label="Switch country or region workspace"
                >
                  {tenantIdsForSwitch.map((id) => (
                    <option key={id} value={id}>
                      {tenantLabel(id)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sidebar-section-label">Menu</div>
            {user?.role === 'super_admin' && asUser && (
              <div className="muted-caption" style={{ marginBottom: 8 }}>
                Viewing as user context
              </div>
            )}

            <NavLink to={withTenant('/')} className={({ isActive }) => (isActive ? 'active' : '')} end>
              <FiHome size={18} />
              Dashboard
            </NavLink>

            <NavLink
              to={withTenant('/video-tracking')}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <FiFilm size={18} />
              Video tracking
            </NavLink>

            <NavLink to={withTenant('/creators')} className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiUsers size={18} />
              Creators
            </NavLink>

            <NavLink to={withTenant('/campaigns')} className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiBriefcase size={18} />
              Campaigns
            </NavLink>

            <NavLink to={withTenant('/videos')} className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiList size={18} />
              Videos List
            </NavLink>

            <NavLink to={withTenant('/upload')} className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiUpload size={18} />
              Add Videos
            </NavLink>

            <NavLink to={withTenant('/creator-offers')} className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiTag size={18} />
              Offer maps
            </NavLink>

            <NavLink to={withTenant('/analytics')} className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiPieChart size={18} />
              Analytics
            </NavLink>

            <NavLink to={withTenant('/personas')} className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiLayers size={18} />
              Personas
            </NavLink>

            <NavLink
              to={withTenant('/sentiment-analysis')}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <FiSmile size={18} />
              Sentiment analysis
            </NavLink>

            {user?.role === 'super_admin' && (
              <NavLink to="/admin/applications" className={({ isActive }) => (isActive ? 'active' : '')}>
                <FiUser size={18} />
                Admin portal
              </NavLink>
            )}

            <div className="sidebar-footer-gap" aria-hidden />

            {/* <a
              className="sidebar-external"
              href="https://console.apify.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FiActivity size={18} />
              Apify Console
            </a> */}

            <button type="button" className="sidebar-external sidebar-signout" onClick={signOut}>
              Sign out
            </button>
          </div>
        </nav>
      </div>

      <button
        type="button"
        className="sidebar-edge-toggle"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        aria-controls="tenant-main-nav"
        aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
      >
        {expanded ? <FiChevronLeft size={20} strokeWidth={2.25} /> : <FiChevronRight size={20} strokeWidth={2.25} />}
      </button>
    </div>
  );
}
