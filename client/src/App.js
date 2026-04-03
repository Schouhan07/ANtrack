import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import BulkUpload from './pages/BulkUpload';
import VideoDetail from './pages/VideoDetail';
import VideosList from './pages/VideosList';
import CampaignManager from './pages/CampaignManager';
import CreatorOfferMappings from './pages/CreatorOfferMappings';
import Analytics from './pages/Analytics';

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
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/overview" element={<Navigate to="/" replace />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/campaigns" element={<CampaignManager />} />
            <Route path="/videos" element={<VideosList />} />
            <Route path="/upload" element={<BulkUpload />} />
            <Route path="/creator-offers" element={<CreatorOfferMappings />} />
            <Route path="/video/:id" element={<VideoDetail />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
