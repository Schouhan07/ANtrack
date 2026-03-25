import React, { useState } from 'react';
import toast from 'react-hot-toast';
import VideoTable from '../components/VideoTable';
import { triggerScrape } from '../services/api';

export default function Dashboard() {
  const [scraping, setScraping] = useState(false);

  const handleScrapeNow = async () => {
    setScraping(true);
    try {
      const res = await triggerScrape();
      toast.success(`Scraped ${res.data.scraped} videos`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Scrape failed');
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="page-dashboard">
      <div className="page-header page-header--hero">
        <div className="page-header-titles">
          <h1>Dashboard</h1>
          <p className="page-subtitle">Scrape fresh metrics and manage your video roster</p>
        </div>
        <button
          className="btn btn-primary"
          disabled={scraping}
          onClick={handleScrapeNow}
        >
          {scraping ? 'Scraping…' : 'Scrape Now'}
        </button>
      </div>

      <VideoTable />
    </div>
  );
}
