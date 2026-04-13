import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { addVideo, addBulkVideos, uploadExcel } from '../services/api';

const ADD_VIDEO_STEPS = [
  { key: 'publishDate', label: 'Video Publish Date', type: 'date' },
  { key: 'influencerName', label: 'Influencer Name', type: 'text', placeholder: 'Display name' },
  { key: 'url', label: 'Post URL', type: 'text', placeholder: 'TikTok or Instagram post URL', required: true },
  { key: 'lob', label: 'Line of Business', type: 'lob' },
  { key: 'totalCost', label: 'Total Cost (in $)', type: 'number', placeholder: 'Optional' },
  { key: 'offerCode', label: 'Coupon code used', type: 'text', placeholder: 'Offer / promo code' },
];

function platformGuessFromUrl(u) {
  const s = String(u || '').toLowerCase();
  if (s.includes('instagram.com') || s.includes('instagr.am')) return 'instagram';
  if (s.includes('tiktok.com') || s.includes('vm.tiktok.com')) return 'tiktok';
  if (s.includes('facebook.com') || s.includes('fb.com') || s.includes('fb.watch')) return 'facebook';
  return '';
}

function AddVideoWaterfall({ initiatedBy, loading, setLoading }) {
  const emptyForm = useMemo(
    () => Object.fromEntries(ADD_VIDEO_STEPS.map((s) => [s.key, ''])),
    []
  );
  const [form, setForm] = useState(emptyForm);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submitVideo = async () => {
    const url = String(form.url || '').trim();
    if (!url) {
      toast.error('Post URL is required');
      return;
    }
    setLoading(true);
    try {
      const totalCostRaw = form.totalCost;
      const totalCost =
        totalCostRaw === '' || totalCostRaw == null
          ? undefined
          : Number(totalCostRaw);
      const platform = platformGuessFromUrl(url) || undefined;
      await addVideo({
        url,
        ...(platform ? { platform } : {}),
        publishDate: form.publishDate || undefined,
        influencerName: form.influencerName.trim() || undefined,
        lob: form.lob || undefined,
        totalCost: Number.isNaN(totalCost) ? undefined : totalCost,
        offerCode: form.offerCode.trim() || undefined,
        initiatedBy,
      });
      toast.success('Video added to tracking');
      setForm({ ...emptyForm });
      window.dispatchEvent(new CustomEvent('videos-updated', { detail: {} }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-card">
      <h3>Add Single Video</h3>
      <p className="bulk-initiated-hint">
        Platform is inferred from the post URL (TikTok, Instagram, or Facebook). Creator details can
        still sync after the first scrape where supported.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ADD_VIDEO_STEPS.map((field) => (
          <div key={field.key} className="form-group">
            <label htmlFor={`video-${field.key}`}>
              {field.label}
              {field.required && <span style={{ color: '#ef4444' }}>*</span>}
            </label>

            {field.type === 'text' && (
              <input
                id={`video-${field.key}`}
                type="text"
                value={form[field.key]}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder || ''}
                autoComplete="off"
              />
            )}

            {field.type === 'date' && (
              <input
                id={`video-${field.key}`}
                type="date"
                value={form[field.key]}
                onChange={(e) => setField(field.key, e.target.value)}
              />
            )}

            {field.type === 'number' && (
              <input
                id={`video-${field.key}`}
                type="number"
                min="0"
                step="0.01"
                value={form[field.key]}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder || ''}
              />
            )}

            {field.type === 'lob' && (
              <select
                id={`video-${field.key}`}
                value={form.lob || ''}
                onChange={(e) => setField('lob', e.target.value)}
              >
                <option value="">Select LOB</option>
                <option value="BUS">BUS</option>
                <option value="FERRY">FERRY</option>
                <option value="TTD">TTD</option>
              </select>
            )}
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary mt-12"
        disabled={loading}
        onClick={submitVideo}
      >
        {loading ? 'Saving…' : 'Add video'}
      </button>
    </div>
  );
}

function urlLines(text) {
  return String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

export default function BulkUpload() {
  const [tiktokUrls, setTiktokUrls] = useState('');
  const [instagramUrls, setInstagramUrls] = useState('');
  const [facebookUrls, setFacebookUrls] = useState('');
  const [initiatedBy, setInitiatedBy] = useState('brand');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submitBulkUrls = async () => {
    const urls = [
      ...urlLines(tiktokUrls).map((url) => ({ url, platform: 'tiktok' })),
      ...urlLines(instagramUrls).map((url) => ({ url, platform: 'instagram' })),
      ...urlLines(facebookUrls).map((url) => ({ url, platform: 'facebook' })),
    ];
    if (urls.length === 0) {
      toast.error('Paste at least one URL in TikTok, Instagram, or Facebook');
      return;
    }

    setLoading(true);
    try {
      const res = await addBulkVideos({ urls, initiatedBy });
      setResult(res.data);
      toast.success(`Added ${res.data.added} video${res.data.added === 1 ? '' : 's'}`);
      setTiktokUrls('');
      setInstagramUrls('');
      setFacebookUrls('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSubmit = async () => {
    if (!file) return toast.error('Select a file first');
    setLoading(true);
    try {
      const res = await uploadExcel(file);
      setResult(res.data);
      toast.success(`Added ${res.data.added} videos`);
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

      <div className="upload-card bulk-initiated-by">
        <h3>Initiated by</h3>
        <p className="bulk-initiated-hint">
          Applies to pasted URL batches below. Choose whether the brand team or supply team
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

      <AddVideoWaterfall
        initiatedBy={initiatedBy}
        loading={loading}
        setLoading={setLoading}
      />

      {result && (
        <div className="results-banner success">
          Added: {result.added} &nbsp;|&nbsp; Duplicates: {result.duplicates}
          {result.errors?.length > 0 && (
            <span> &nbsp;|&nbsp; Errors: {result.errors.length}</span>
          )}
        </div>
      )}

      <div className="upload-card bulk-urls-card">
        <h3>URLs</h3>
        <p className="bulk-initiated-hint" style={{ marginTop: 0 }}>
          Paste post links below—one URL per line per platform. Submit once to add every non-empty box.
        </p>
        <div className="bulk-url-platform-grid">
          <div className="form-group bulk-url-platform-field">
            <label htmlFor="bulk-url-tiktok">
              <span className="badge badge-tiktok bulk-url-badge">TikTok</span>
            </label>
            <textarea
              id="bulk-url-tiktok"
              rows={5}
              placeholder={
                'https://www.tiktok.com/@user/video/123456789\nhttps://www.tiktok.com/@user/video/987654321'
              }
              value={tiktokUrls}
              onChange={(e) => setTiktokUrls(e.target.value)}
            />
          </div>
          <div className="form-group bulk-url-platform-field">
            <label htmlFor="bulk-url-instagram">
              <span className="badge badge-instagram bulk-url-badge">Instagram</span>
            </label>
            <textarea
              id="bulk-url-instagram"
              rows={5}
              placeholder={
                'https://www.instagram.com/reel/ABC123/\nhttps://www.instagram.com/reel/XYZ789/'
              }
              value={instagramUrls}
              onChange={(e) => setInstagramUrls(e.target.value)}
            />
          </div>
          <div className="form-group bulk-url-platform-field">
            <label htmlFor="bulk-url-facebook">
              <span className="badge badge-facebook bulk-url-badge">Facebook</span>
            </label>
            <textarea
              id="bulk-url-facebook"
              rows={5}
              placeholder={'https://www.facebook.com/reel/...\nhttps://fb.watch/...'}
              value={facebookUrls}
              onChange={(e) => setFacebookUrls(e.target.value)}
            />
          </div>
        </div>
        <button className="btn btn-primary mt-12" disabled={loading} onClick={submitBulkUrls}>
          {loading ? 'Submitting…' : 'Submit URLs'}
        </button>
      </div>

      <div className="upload-card">
        <h3>Upload Excel (.xlsx, .xls, .csv)</h3>
        <p className="bulk-initiated-hint" style={{ marginTop: 0 }}>
          First sheet is read. Required column: <strong>URL</strong>. Optional: Creator, Campaign,
          Platform (tiktok / instagram / facebook), InitiatedBy, Created By, Publish Date, Influencer Name,
          Influencer Handle, LOB, Video Duration, Total Cost, Coupon code used, Sales.
        </p>
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
