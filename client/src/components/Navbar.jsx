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
} from 'react-icons/fi';

export default function Navbar() {
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
    <nav className="sidebar">
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

      {user?.role === 'super_admin' && (
        <NavLink to="/admin/applications" className={({ isActive }) => (isActive ? 'active' : '')}>
          <FiUser size={18} />
          Admin portal
        </NavLink>
      )}

      <div className="sidebar-spacer" aria-hidden />

      <a
        className="sidebar-external"
        href="https://console.apify.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FiActivity size={18} />
        Apify Console
      </a>

      <button type="button" className="sidebar-external sidebar-signout" onClick={signOut}>
        Sign out
      </button>
    </nav>
  );
}
