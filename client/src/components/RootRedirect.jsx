import React from 'react';
import { Navigate } from 'react-router-dom';

export default function RootRedirect() {
  try {
    const u = JSON.parse(localStorage.getItem('antrack_user') || '{}');
    if (u.role === 'super_admin') {
      return <Navigate to="/admin/applications" replace />;
    }
    if (u.tenantIds?.length) {
      return <Navigate to={`/${u.tenantIds[0]}`} replace />;
    }
  } catch {
    /* fall through */
  }
  return <Navigate to="/login" replace />;
}
