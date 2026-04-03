import React from 'react';

export const INITIAL_TRACKING_FILTERS = {
  video: '',
  creator: '',
  campaign: '',
  viewsMin: '',
  viewsMax: '',
  engagementMin: '',
  engagementMax: '',
  sharesMin: '',
  sharesMax: '',
  savesMin: '',
  savesMax: '',
};

/**
 * Filter bar for Video Tracking: text match on video/creator/campaign; numeric ranges for metrics.
 */
export default function VideoTrackingFilters({ filters, onFilterChange, onClear }) {
  const f = filters;

  return (
    <div className="video-tracking-filters" role="search" aria-label="Filter videos">
      <div className="video-tracking-filter-row">
        <div className="video-tracking-filter-field">
          <label className="video-tracking-filter-label" htmlFor="vt-filter-video">
            Video
          </label>
          <input
            id="vt-filter-video"
            type="search"
            className="video-tracking-filter-input"
            placeholder="URL or title…"
            value={f.video}
            onChange={(e) => onFilterChange('video', e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="video-tracking-filter-field">
          <label className="video-tracking-filter-label" htmlFor="vt-filter-creator">
            Creator
          </label>
          <input
            id="vt-filter-creator"
            type="search"
            className="video-tracking-filter-input"
            placeholder="Name…"
            value={f.creator}
            onChange={(e) => onFilterChange('creator', e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="video-tracking-filter-field">
          <label className="video-tracking-filter-label" htmlFor="vt-filter-campaign">
            Campaign
          </label>
          <input
            id="vt-filter-campaign"
            type="search"
            className="video-tracking-filter-input"
            placeholder="Campaign…"
            value={f.campaign}
            onChange={(e) => onFilterChange('campaign', e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="video-tracking-filter-row">
        <div className="video-tracking-filter-field video-tracking-filter-field--range">
          <span className="video-tracking-filter-label">Views</span>
          <div className="video-tracking-filter-range">
            <input
              type="text"
              inputMode="numeric"
              className="video-tracking-filter-input"
              placeholder="Min"
              value={f.viewsMin}
              onChange={(e) => onFilterChange('viewsMin', e.target.value)}
              aria-label="Views minimum"
            />
            <span aria-hidden>–</span>
            <input
              type="text"
              inputMode="numeric"
              className="video-tracking-filter-input"
              placeholder="Max"
              value={f.viewsMax}
              onChange={(e) => onFilterChange('viewsMax', e.target.value)}
              aria-label="Views maximum"
            />
          </div>
        </div>
        <div className="video-tracking-filter-field video-tracking-filter-field--range">
          <span className="video-tracking-filter-label">Engagement %</span>
          <div className="video-tracking-filter-range">
            <input
              type="text"
              inputMode="decimal"
              className="video-tracking-filter-input"
              placeholder="Min"
              value={f.engagementMin}
              onChange={(e) => onFilterChange('engagementMin', e.target.value)}
              aria-label="Engagement percent minimum"
            />
            <span aria-hidden>–</span>
            <input
              type="text"
              inputMode="decimal"
              className="video-tracking-filter-input"
              placeholder="Max"
              value={f.engagementMax}
              onChange={(e) => onFilterChange('engagementMax', e.target.value)}
              aria-label="Engagement percent maximum"
            />
          </div>
        </div>
        <div className="video-tracking-filter-field video-tracking-filter-field--range">
          <span className="video-tracking-filter-label">Shares</span>
          <div className="video-tracking-filter-range">
            <input
              type="text"
              inputMode="numeric"
              className="video-tracking-filter-input"
              placeholder="Min"
              value={f.sharesMin}
              onChange={(e) => onFilterChange('sharesMin', e.target.value)}
              aria-label="Shares minimum"
            />
            <span aria-hidden>–</span>
            <input
              type="text"
              inputMode="numeric"
              className="video-tracking-filter-input"
              placeholder="Max"
              value={f.sharesMax}
              onChange={(e) => onFilterChange('sharesMax', e.target.value)}
              aria-label="Shares maximum"
            />
          </div>
        </div>
        <div className="video-tracking-filter-field video-tracking-filter-field--range">
          <span className="video-tracking-filter-label">Saves</span>
          <div className="video-tracking-filter-range">
            <input
              type="text"
              inputMode="numeric"
              className="video-tracking-filter-input"
              placeholder="Min"
              value={f.savesMin}
              onChange={(e) => onFilterChange('savesMin', e.target.value)}
              aria-label="Saves minimum"
            />
            <span aria-hidden>–</span>
            <input
              type="text"
              inputMode="numeric"
              className="video-tracking-filter-input"
              placeholder="Max"
              value={f.savesMax}
              onChange={(e) => onFilterChange('savesMax', e.target.value)}
              aria-label="Saves maximum"
            />
          </div>
        </div>
        <button type="button" className="video-tracking-clear" onClick={onClear}>
          Clear filters
        </button>
      </div>
    </div>
  );
}
