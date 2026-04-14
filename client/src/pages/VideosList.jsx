import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  fetchVideos,
  deleteVideo,
  updateVideoStatus,
  updateVideo,
  triggerScrape,
} from '../services/api';

export default function VideosList() {
  const [videos, setVideos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [urlQuery, setUrlQuery] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [scrapeLoading, setScrapeLoading] = useState(false);

  const notifyVideosUpdated = (payload) => {
    window.dispatchEvent(new CustomEvent('videos-updated', { detail: payload || {} }));
  };

  const load = () => {
    const params = {};
    if (filter !== 'all') params.platform = filter;
    fetchVideos(params)
      .then((res) => setVideos(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    load();
    const onVideosUpdated = () => load();
    window.addEventListener('videos-updated', onVideosUpdated);
    return () => window.removeEventListener('videos-updated', onVideosUpdated);
  }, [filter]);

  const handleScrapeNow = async () => {
    setScrapeLoading(true);
    try {
      const res = await triggerScrape();
      const { scraped, warnings = [], counts } = res.data;
      if (warnings.length > 0) {
        toast(warnings.join('\n'), { icon: '⚠️', duration: 10000 });
      }
      const q =
        counts != null
          ? ` (${counts.tiktok ?? 0} TikTok, ${counts.instagram ?? 0} Instagram in queue)`
          : '';
      toast.success(`Scraped ${scraped} metric row(s)${q}`);
      notifyVideosUpdated({});
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Scrape failed');
    } finally {
      setScrapeLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this video from tracking?')) return;
    try {
      await deleteVideo(id);
      toast.success('Video removed');
      notifyVideosUpdated({ id });
      load();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const toggleStatus = async (id, current) => {
    const next = current === 'active' ? 'paused' : 'active';
    try {
      await updateVideoStatus(id, next);
      notifyVideosUpdated({ id });
      load();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const openEdit = (v) => {
    const pd = v.publishDate;
    const publishStr =
      pd == null
        ? ''
        : typeof pd === 'string'
          ? pd.slice(0, 10)
          : new Date(pd).toISOString().slice(0, 10);
    setEditForm({
      _id: v._id,
      url: v.url || '',
      creator: v.creator || '',
      platform: v.platform || 'unknown',
      initiatedBy: v.initiatedBy === 'supply' ? 'supply' : 'brand',
      campaign: v.campaign || '',
      publishDate: publishStr,
      influencerName: v.influencerName || '',
      lob: v.lob || '',
      videoDuration: v.videoDuration || '',
      totalCost:
        v.totalCost != null && v.totalCost !== '' ? String(v.totalCost) : '',
      offerCode: v.offerCode || '',
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm) return;
    try {
      const tc =
        editForm.totalCost === '' ? null : Number(editForm.totalCost);
      await updateVideo(editForm._id, {
        url: editForm.url.trim(),
        creator: editForm.creator.trim(),
        platform: editForm.platform,
        initiatedBy: editForm.initiatedBy,
        campaign: editForm.campaign.trim(),
        publishDate: editForm.publishDate || null,
        influencerName: editForm.influencerName.trim(),
        lob: editForm.lob.trim(),
        videoDuration: editForm.videoDuration.trim(),
        totalCost: editForm.totalCost === '' || Number.isNaN(tc) ? null : tc,
        offerCode: editForm.offerCode.trim(),
      });
      toast.success('Video updated');
      setEditForm(null);
      notifyVideosUpdated({ id: editForm._id });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  const editModal =
    editForm &&
    createPortal(
      <div
        className="influencer-modal-backdrop"
        role="presentation"
        onClick={() => setEditForm(null)}
      >
        <div
          className="influencer-modal influencer-modal--wide videos-edit-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="videos-edit-title"
          onClick={(ev) => ev.stopPropagation()}
        >
          <div className="influencer-modal-head">
            <h2 id="videos-edit-title" className="influencer-modal-title">
              Edit tracked video
            </h2>
            <button
              type="button"
              className="influencer-modal-close"
              aria-label="Close"
              onClick={() => setEditForm(null)}
            >
              ×
            </button>
          </div>
          <form onSubmit={saveEdit} className="videos-edit-form">
            <div className="videos-edit-grid">
              <div className="form-group">
                <label htmlFor="edit-url">Post URL</label>
                <input
                  id="edit-url"
                  type="text"
                  value={editForm.url}
                  onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-platform">Platform</label>
                <select
                  id="edit-platform"
                  value={editForm.platform}
                  onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })}
                >
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="edit-publishDate">Publish Date</label>
                <input
                  id="edit-publishDate"
                  type="date"
                  value={editForm.publishDate}
                  onChange={(e) => setEditForm({ ...editForm, publishDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-influencerName">Influencer Name</label>
                <input
                  id="edit-influencerName"
                  type="text"
                  value={editForm.influencerName}
                  onChange={(e) => setEditForm({ ...editForm, influencerName: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-creator">Creator (legacy / scrape)</label>
                <input
                  id="edit-creator"
                  type="text"
                  value={editForm.creator}
                  onChange={(e) => setEditForm({ ...editForm, creator: e.target.value })}
                  placeholder="Often synced from influencer name"
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-lob">LOB</label>
                <input
                  id="edit-lob"
                  type="text"
                  value={editForm.lob}
                  onChange={(e) => setEditForm({ ...editForm, lob: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-videoDuration">Video Duration</label>
                <input
                  id="edit-videoDuration"
                  type="text"
                  value={editForm.videoDuration}
                  onChange={(e) => setEditForm({ ...editForm, videoDuration: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-totalCost">Total Cost</label>
                <input
                  id="edit-totalCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.totalCost}
                  onChange={(e) => setEditForm({ ...editForm, totalCost: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-offerCode">Coupon code used</label>
                <input
                  id="edit-offerCode"
                  type="text"
                  value={editForm.offerCode}
                  onChange={(e) => setEditForm({ ...editForm, offerCode: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <span className="form-group-label">Initiated by</span>
                <div className="bulk-initiated-options">
                  <label className="bulk-radio">
                    <input
                      type="radio"
                      name="edit-initiatedBy"
                      checked={editForm.initiatedBy === 'brand'}
                      onChange={() => setEditForm({ ...editForm, initiatedBy: 'brand' })}
                    />
                    Brand
                  </label>
                  <label className="bulk-radio">
                    <input
                      type="radio"
                      name="edit-initiatedBy"
                      checked={editForm.initiatedBy === 'supply'}
                      onChange={() => setEditForm({ ...editForm, initiatedBy: 'supply' })}
                    />
                    Supply
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="edit-campaign">Campaign</label>
                <input
                  id="edit-campaign"
                  type="text"
                  value={editForm.campaign}
                  onChange={(e) => setEditForm({ ...editForm, campaign: e.target.value })}
                  placeholder="Optional"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="videos-edit-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setEditForm(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );

  const tiktokCount = videos.filter((v) => v.platform === 'tiktok').length;
  const igCount = videos.filter((v) => v.platform === 'instagram').length;
  const fbCount = videos.filter((v) => v.platform === 'facebook').length;

  const filteredVideos = useMemo(() => {
    const q = urlQuery.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter((v) => {
      const parts = [
        v.url,
        v.creator,
        v.campaign,
        v.createdBy,
        v.influencerName,
        v.influencerHandle,
        v.lob,
        v.offerCode,
        v.videoDuration,
        v.totalCost != null ? String(v.totalCost) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return parts.includes(q);
    });
  }, [videos, urlQuery]);

  return (
    <div>
      <div className="page-header">
        <h1>Tracked Videos</h1>
      </div>

      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="label">Total</div>
          <div className="value">{videos.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">TikTok</div>
          <div className="value">{tiktokCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">Instagram</div>
          <div className="value">{igCount}</div>
        </div>
        <div className="stat-card">
          <div className="label">Facebook</div>
          <div className="value">{fbCount}</div>
        </div>
      </div>

      <div className="filter-bar videos-list-toolbar" style={{ marginBottom: 16 }}>
        {['all', 'tiktok', 'instagram', 'facebook'].map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <input
          type="search"
          className="videos-url-search"
          placeholder="Search URL, influencer, LOB, coupon…"
          value={urlQuery}
          onChange={(e) => setUrlQuery(e.target.value)}
          aria-label="Search tracked videos by URL"
        />
        <button
          type="button"
          className="btn btn-sm btn-primary videos-list-scrape-btn"
          disabled={scrapeLoading || videos.length === 0}
          onClick={handleScrapeNow}
        >
          {scrapeLoading ? 'Scraping…' : 'Scrape metrics now'}
        </button>
      </div>

      <div className="card">
        {videos.length === 0 ? (
          <div className="empty-state">No videos added yet.</div>
        ) : filteredVideos.length === 0 ? (
          <div className="empty-state">
            No videos match “{urlQuery.trim()}”. Try another part of the URL.
          </div>
        ) : (
          <div className="table-wrap videos-tracked-wide">
            <table>
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Platform</th>
                  <th>Influencer</th>
                  <th>Publish</th>
                  <th>LOB</th>
                  <th>Duration</th>
                  <th>Cost</th>
                  <th>Coupon</th>
                  <th>Creator</th>
                  <th>Initiated by</th>
                  <th>Campaign</th>
                  <th>Added</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVideos.map((v) => (
                  <tr key={v._id}>
                    <td className="url-cell">
                      <a href={v.url} target="_blank" rel="noopener noreferrer">
                        {v.url}
                      </a>
                    </td>
                    <td>
                      <span className={`badge badge-${v.platform}`}>
                        {v.platform}
                      </span>
                    </td>
                    <td>{v.influencerName || '—'}</td>
                    <td>
                      {v.publishDate
                        ? new Date(v.publishDate).toLocaleDateString()
                        : '—'}
                    </td>
                    <td>{v.lob || '—'}</td>
                    <td>{v.videoDuration || '—'}</td>
                    <td>
                      {v.totalCost != null && v.totalCost !== ''
                        ? Number(v.totalCost).toLocaleString()
                        : '—'}
                    </td>
                    <td>{v.offerCode || '—'}</td>
                    <td>{v.creator || '—'}</td>
                    <td>
                      <span className="badge badge-initiated badge-initiated--subtle">
                        {v.initiatedBy === 'supply' ? 'Supply' : 'Brand'}
                      </span>
                    </td>
                    <td>{v.campaign || '—'}</td>
                    <td>{new Date(v.addedDate).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={`badge ${v.status === 'active' ? 'badge-tiktok' : 'badge-instagram'}`}
                      >
                        {v.status}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => openEdit(v)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => toggleStatus(v._id, v.status)}
                      >
                        {v.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(v._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editModal}
    </div>
  );
}
