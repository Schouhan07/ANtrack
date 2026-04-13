import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function AdminLayout() {
  const navigate = useNavigate();

  const signOut = () => {
    localStorage.removeItem('antrack_token');
    localStorage.removeItem('antrack_user');
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-portal">
      <aside className="admin-portal-sidebar">
        <div className="sidebar-brand" style={{ marginBottom: 20 }}>
          <div className="sidebar-logo">
            AN<span>Track</span>
          </div>
          <p className="sidebar-tagline">Admin portal</p>
        </div>
        <nav className="admin-portal-nav">
          <NavLink to="/admin/applications" end className="admin-portal-link">
            Access requests
          </NavLink>
          <NavLink to="/admin/users" end className="admin-portal-link">
            All users
          </NavLink>
        </nav>
        <button type="button" className="btn btn-secondary admin-portal-signout" onClick={signOut}>
          Sign out
        </button>
      </aside>
      <div className="admin-portal-main">
        <Outlet />
      </div>
    </div>
  );
}
