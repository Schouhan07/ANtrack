import React from 'react';
import { FiSmile } from 'react-icons/fi';

/**
 * Placeholder for future sentiment work (e.g. comment tone, campaign narrative from scraped text).
 */
export default function SentimentAnalysisPage() {
  return (
    <div className="page-dashboard page-overview">
      <div className="page-header">
        <h1>Sentiment analysis</h1>
        <p className="page-subtitle muted-caption">
          Understand tone and engagement quality across your tracked portfolio — wiring to live data
          can follow in a later iteration.
        </p>
      </div>
      <div className="card" style={{ maxWidth: 640, padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <FiSmile size={28} style={{ color: 'var(--indigo, #6366f1)' }} aria-hidden />
          <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Coming soon</h2>
        </div>
        <p className="muted-caption" style={{ margin: 0, lineHeight: 1.65 }}>
          Planned direction: aggregate signals from comments and captions (where available), compare
          regions and campaigns, and surface alerts when sentiment shifts vs your baseline. If you
          want a specific data source or model first, note it for implementation.
        </p>
      </div>
    </div>
  );
}
