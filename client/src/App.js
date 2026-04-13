import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import RequireAuth from './components/RequireAuth';
import RootRedirect from './components/RootRedirect';
import Login from './pages/Login';
import Apply from './pages/Apply';
import AdminLayout from './pages/admin/AdminLayout';
import AdminApplications from './pages/admin/AdminApplications';
import AdminUsers from './pages/AdminUsers';
import TenantShell from './pages/TenantShell';

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
            color: '#f8fafc',
            borderRadius: '14px',
            boxShadow: '0 12px 40px rgba(15, 23, 42, 0.22)',
            padding: '14px 18px',
            fontSize: '0.9rem',
          },
          success: {
            iconTheme: { primary: '#34d399', secondary: '#1e1b4b' },
          },
          error: {
            iconTheme: { primary: '#fb7185', secondary: '#1e1b4b' },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/apply" element={<Apply />} />
        <Route
          path="/admin"
          element={
            <RequireAuth requireAdmin>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="applications" replace />} />
          <Route path="applications" element={<AdminApplications />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
        <Route
          path="/:tenant/*"
          element={
            <RequireAuth>
              <TenantShell />
            </RequireAuth>
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <RootRedirect />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
