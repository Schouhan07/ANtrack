import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTenantPath } from '../hooks/useTenantPath';
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
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';

export default function Navbar({ expanded = true, onToggleExpanded = () => {} }) {
  const { withTenant } = useTenantPath();
  const navigate = useNavigate();
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('antrack_user') || 'null');
    } catch {
      return null;
    }
  }, []);

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

            <div className="sidebar-section-label">Menu</div>

            <NavLink to={withTenant('/')} className={({ isActive }) => (isActive ? 'active' : '')} end>
              <FiHome size={18} />
              Dashboard
            </NavLink>

            <NavLink to={withTenant('/analytics')} className={({ isActive }) => (isActive ? 'active' : '')}>
              <FiPieChart size={18} />
              Analytics
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
