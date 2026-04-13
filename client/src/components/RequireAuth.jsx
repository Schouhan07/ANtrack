import React from 'react';
import { Navigate } from 'react-router-dom';

export default function RequireAuth({ children, requireAdmin }) {
  const token = localStorage.getItem('antrack_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (requireAdmin) {
    try {
      const u = JSON.parse(localStorage.getItem('antrack_user') || '{}');
      if (u.role !== 'super_admin') {
        return <Navigate to="/" replace />;
      }
    } catch {
      return <Navigate to="/login" replace />;
    }
  }
  return children;
}
