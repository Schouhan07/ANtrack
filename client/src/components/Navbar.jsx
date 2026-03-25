import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiHome,
  FiBarChart2,
  FiUpload,
  FiList,
  FiActivity,
  FiBriefcase,
  FiTag,
  FiPieChart,
} from 'react-icons/fi';

export default function Navbar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          AN<span>Track</span>
        </div>
        <p className="sidebar-tagline">Influencer intelligence</p>
      </div>

      <div className="sidebar-section-label">Menu</div>

      <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
        <FiHome size={18} />
        Dashboard
      </NavLink>

      <NavLink to="/overview" className={({ isActive }) => (isActive ? 'active' : '')}>
        <FiBarChart2 size={18} />
        Overview
      </NavLink>

      <NavLink to="/analytics" className={({ isActive }) => (isActive ? 'active' : '')}>
        <FiPieChart size={18} />
        Analytics
      </NavLink>

      <NavLink to="/campaigns" className={({ isActive }) => (isActive ? 'active' : '')}>
        <FiBriefcase size={18} />
        Campaigns
      </NavLink>

      <NavLink to="/videos" className={({ isActive }) => (isActive ? 'active' : '')}>
        <FiList size={18} />
        Videos List
      </NavLink>

      <NavLink to="/upload" className={({ isActive }) => (isActive ? 'active' : '')}>
        <FiUpload size={18} />
        Add Videos
      </NavLink>

      <NavLink to="/creator-offers" className={({ isActive }) => (isActive ? 'active' : '')}>
        <FiTag size={18} />
        Offer maps
      </NavLink>

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
    </nav>
  );
}
