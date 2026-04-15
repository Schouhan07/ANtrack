import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTenantPath } from '../hooks/useTenantPath';
import { addBulkVideos, uploadExcel, triggerScrape } from '../services/api';

const EMPTY_ADD_FORM = {
  urlTiktok: '',
  urlInstagram: '',
  urlFacebook: '',
  campaign: '',
  lob: '',
  publishDate: '',
  influencerName: '',
  totalCost: '',
  offerCode: '',
};

function urlLines(text) {
  return String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function AddVideosCard({ initiatedBy, loading, setLoading, onBatchResult }) {
  const emptyForm = useMemo(() => ({ ...EMPTY_ADD_FORM }), []);
  const [form, setForm] = useState(emptyForm);
  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submitVideos = async () => {
    const entries = [
      ...urlLines(form.urlTiktok).map((url) => ({ url, platform: 'tiktok' })),
      ...urlLines(form.urlInstagram).map((url) => ({ url, platform: 'instagram' })),
      ...urlLines(form.urlFacebook).map((url) => ({ url, platform: 'facebook' })),
    ];
    if (entries.length === 0) {
      toast.error('Add at least one URL under TikTok, Instagram, or Facebook');
      return;
    }

    const totalCostRaw = form.totalCost;
    const totalCost =
      totalCostRaw === '' || totalCostRaw == null ? undefined : Number(totalCostRaw);
    const shared = {
      ...(form.publishDate ? { publishDate: form.publishDate } : {}),
      ...(form.influencerName.trim() ? { influencerName: form.influencerName.trim() } : {}),
      ...(form.campaign.trim() ? { campaign: form.campaign.trim() } : {}),
      ...(form.lob ? { lob: form.lob } : {}),
      ...(Number.isNaN(totalCost) ? {} : totalCost !== undefined ? { totalCost } : {}),
      ...(form.offerCode.trim() ? { offerCode: form.offerCode.trim() } : {}),
    };
    const urls = entries.map((e) => ({ ...e, ...shared }));

    setLoading(true);
    try {
      const res = await addBulkVideos({ urls, initiatedBy });
      if (onBatchResult) onBatchResult(res.data);
      toast.success(`Added ${res.data.added} video${res.data.added === 1 ? '' : 's'}`);
      setForm({ ...emptyForm });
      window.dispatchEvent(new CustomEvent('videos-updated', { detail: {} }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add videos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-card">
      <h3>Add videos</h3>
      {/* <p className="bulk-initiated-hint">
        Enter campaign through coupon code as needed, then paste post URLs by platform (one per
        line). Filled fields apply to every URL in this submit. Creator details can still sync after
        the first scrape where supported.
      </p> */}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-group">
          <label htmlFor="add-video-campaign">Campaign name (optional)</label>
          <input
            id="add-video-campaign"
            type="text"
            value={form.campaign}
            onChange={(e) => setField('campaign', e.target.value)}
            placeholder="Leave blank if not applicable"
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label htmlFor="add-video-lob">Line of business</label>
          <select
            id="add-video-lob"
            value={form.lob}
            onChange={(e) => setField('lob', e.target.value)}
          >
            <option value="">Select LOB</option>
            <option value="BUS">BUS</option>
            <option value="FERRY">FERRY</option>
            <option value="TTD">TTD</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="add-video-influencer">Influencer name</label>
          <input
            id="add-video-influencer"
            type="text"
            value={form.influencerName}
            onChange={(e) => setField('influencerName', e.target.value)}
            placeholder="Display name"
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label htmlFor="add-video-publish">Video publish date</label>
          <input
            id="add-video-publish"
            type="date"
            value={form.publishDate}
            onChange={(e) => setField('publishDate', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="add-video-cost">Total cost (optional)</label>
          <input
            id="add-video-cost"
            type="number"
            min="0"
            step="0.01"
            value={form.totalCost}
            onChange={(e) => setField('totalCost', e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="form-group">
          <label htmlFor="add-video-offer">Coupon code used</label>
          <input
            id="add-video-offer"
            type="text"
            value={form.offerCode}
            onChange={(e) => setField('offerCode', e.target.value)}
            placeholder="Offer / promo code"
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label className="bulk-post-url-label">Post URL</label>
          <p className="bulk-initiated-hint" style={{ marginTop: 4, marginBottom: 8 }}>
            Use the box for each platform. You can fill one or more.
          </p>
          <div className="bulk-url-platform-grid">
            <div className="form-group bulk-url-platform-field">
              <label htmlFor="add-video-url-tiktok">
                <span className="badge badge-tiktok bulk-url-badge">TikTok</span>
              </label>
              <textarea
                id="add-video-url-tiktok"
                rows={4}
                placeholder={
                  'https://www.tiktok.com/@user/video/123456789\nhttps://www.tiktok.com/@user/video/987654321'
                }
                value={form.urlTiktok}
                onChange={(e) => setField('urlTiktok', e.target.value)}
              />
            </div>
            <div className="form-group bulk-url-platform-field">
              <label htmlFor="add-video-url-instagram">
                <span className="badge badge-instagram bulk-url-badge">Instagram</span>
              </label>
              <textarea
                id="add-video-url-instagram"
                rows={4}
                placeholder={
                  'https://www.instagram.com/reel/ABC123/\nhttps://www.instagram.com/reel/XYZ789/'
                }
                value={form.urlInstagram}
                onChange={(e) => setField('urlInstagram', e.target.value)}
              />
            </div>
            <div className="form-group bulk-url-platform-field">
              <label htmlFor="add-video-url-facebook">
                <span className="badge badge-facebook bulk-url-badge">Facebook</span>
              </label>
              <textarea
                id="add-video-url-facebook"
                rows={4}
                placeholder={'https://www.facebook.com/reel/...\nhttps://fb.watch/...'}
                value={form.urlFacebook}
                onChange={(e) => setField('urlFacebook', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary mt-12" disabled={loading} onClick={submitVideos}>
        {loading ? 'Adding…' : 'Add videos'}
      </button>
    </div>
  );
}

export default function BulkUpload() {
  const { withTenant } = useTenantPath();
  const [initiatedBy, setInitiatedBy] = useState('brand');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scrapeLoading, setScrapeLoading] = useState(false);

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
      window.dispatchEvent(new CustomEvent('videos-updated', { detail: {} }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Scrape failed');
    } finally {
      setScrapeLoading(false);
    }
  };

  const handleFileSubmit = async () => {
    if (!file) return toast.error('Select a file first');
    setLoading(true);
    try {
      const res = await uploadExcel(file, initiatedBy);
      setResult(res.data);
      const { added, duplicates, errors = [] } = res.data;
      if (added === 0 && duplicates === 0 && errors.length > 0) {
        toast.error(`Import finished with ${errors.length} issue(s). See details below.`);
      } else if (added === 0 && duplicates === 0) {
        toast('No new videos were added.', { icon: 'ℹ️' });
      } else if (errors.length > 0) {
        toast.success(`Added ${added} video${added === 1 ? '' : 's'} (${errors.length} row note(s))`);
      } else {
        toast.success(`Added ${added} video${added === 1 ? '' : 's'}`);
      }
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-section">
      <h1>Add Videos to Track</h1>

      <div className="upload-card bulk-post-upload-actions">
        <h3>After you add URLs</h3>
        <p className="bulk-initiated-hint">
          Open <strong>Videos List</strong> to see every tracked link for this workspace, then run a
          scrape to pull TikTok and Instagram metrics (same job as Dashboard → Performance).
        </p>
        <div className="bulk-post-upload-actions-row">
          <NavLink to={withTenant('/videos')} className="btn btn-secondary">
            View all tracked URLs
          </NavLink>
          <button
            type="button"
            className="btn btn-primary"
            disabled={scrapeLoading}
            onClick={handleScrapeNow}
          >
            {scrapeLoading ? 'Scraping…' : 'Scrape metrics now'}
          </button>
        </div>
      </div>

      <div className="upload-card bulk-initiated-by">
        <h3>Initiated by</h3>
        <p className="bulk-initiated-hint">
          Applies to manual &quot;Add videos&quot; below. Choose whether the brand team or supply team
          requested tracking.
        </p>
        <div className="bulk-initiated-options">
          <label className="bulk-radio">
            <input
              type="radio"
              name="initiatedBy"
              value="brand"
              checked={initiatedBy === 'brand'}
              onChange={() => setInitiatedBy('brand')}
            />
            Brand
          </label>
          <label className="bulk-radio">
            <input
              type="radio"
              name="initiatedBy"
              value="supply"
              checked={initiatedBy === 'supply'}
              onChange={() => setInitiatedBy('supply')}
            />
            Supply team
          </label>
        </div>
      </div>

      <AddVideosCard
        initiatedBy={initiatedBy}
        loading={loading}
        setLoading={setLoading}
        onBatchResult={setResult}
      />

      {result && (
        <div
          className={`results-banner ${
            result.errors?.length > 0 && result.added === 0 && result.duplicates === 0
              ? 'error'
              : result.added > 0 || result.duplicates > 0 || (result.errors?.length ?? 0) > 0
                ? 'success'
                : ''
          }`.trim()}
        >
          <div>
            Added: {result.added} &nbsp;|&nbsp; Duplicates: {result.duplicates}
            {result.errors?.length > 0 && (
              <span> &nbsp;|&nbsp; Row notes: {result.errors.length}</span>
            )}
          </div>
          {result.errors?.length > 0 && (
            <ul className="bulk-import-errors">
              {result.errors.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="upload-card">
        <h3>Upload Excel (.xlsx, .xls, .csv)</h3>
        {/* <p className="bulk-initiated-hint" style={{ marginBottom: 12 }}>
          Row 1 must be these headers only (order can vary; names are case-insensitive). Each data
          row can list multiple URLs in TikTok, Instagram, and/or Facebook cells—one URL per line.
          Empty campaign cells are fine. Initiated by uses the same Brand / Supply choice as above.
        </p> */}
        <pre
          className="bulk-excel-headers-preview"
          style={{
            fontSize: 12,
            marginBottom: 12,
            padding: 12,
            background: 'rgba(0,0,0,0.06)',
            borderRadius: 8,
            overflowX: 'auto',
          }}
        >
          {[
            'Campaign name',
            'Line of business',
            'Influencer name',
            'Video publish date',
            'Total cost (optional)',
            'Coupon code used',
            'TikTok',
            'Instagram',
            'Facebook',
          ].join('\t')}
        </pre>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button
          className="btn btn-primary mt-12"
          disabled={loading || !file}
          onClick={handleFileSubmit}
        >
          {loading ? 'Uploading…' : 'Upload & import'}
        </button>
      </div>
    </div>
  );
}
