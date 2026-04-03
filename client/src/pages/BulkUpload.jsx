import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  addVideo,
  addBulkVideos,
  uploadExcel,
  importGoogleSheet,
} from '../services/api';

const ADD_VIDEO_STEPS = [
  { key: 'publishDate', label: 'Video Publish Date', type: 'date' },
  { key: 'influencerName', label: 'Influencer Name', type: 'text', placeholder: 'Display name' },
  { key: 'influencerHandle', label: 'Influencer Handle', type: 'text', placeholder: '@handle' },
  { key: 'url', label: 'Post URL', type: 'text', placeholder: 'TikTok or Instagram post URL', required: true },
  { key: 'platform', label: 'Platform', type: 'platform' },
  { key: 'lob', label: 'Line of Business', type: 'lob' },
  { key: 'videoDuration', label: 'Video Duration', type: 'text', placeholder: 'e.g. 0:45 or 45s' },
  { key: 'totalCost', label: 'Total Cost (in RM)', type: 'number', placeholder: 'Optional' },
  { key: 'offerCode', label: 'Coupon code used', type: 'text', placeholder: 'Offer / promo code' },
];

function platformGuessFromUrl(u) {
  const s = String(u || '').toLowerCase();
  if (s.includes('instagram.com') || s.includes('instagr.am')) return 'instagram';
  if (s.includes('tiktok.com') || s.includes('vm.tiktok.com')) return 'tiktok';
  return '';
}

function AddVideoWaterfall({ initiatedBy, loading, setLoading }) {
  const emptyForm = useMemo(
    () => Object.fromEntries(ADD_VIDEO_STEPS.map((s) => [s.key, ''])),
    []
  );
  const [step, setStep] = useState(0); // kept for compatibility with existing logic, not used in form layout
  const [form, setForm] = useState(emptyForm);

  const current = ADD_VIDEO_STEPS[step];
  const total = ADD_VIDEO_STEPS.length;

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
      await addVideo({
        url,
        platform: form.platform || undefined,
        publishDate: form.publishDate || undefined,
        influencerName: form.influencerName.trim() || undefined,
        influencerHandle: form.influencerHandle.trim() || undefined,
        lob: form.lob || undefined,
        videoDuration: form.videoDuration.trim() || undefined,
        totalCost: Number.isNaN(totalCost) ? undefined : totalCost,
        offerCode: form.offerCode.trim() || undefined,
        initiatedBy,
      });
      toast.success('Video added to tracking');
      setStep(0);
      setForm({ ...emptyForm });
      window.dispatchEvent(new CustomEvent('videos-updated', { detail: {} }));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add video');
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (current.key === 'url' && !String(form.url || '').trim()) {
      toast.error('Enter the post URL');
      return;
    }
    if (current.key === 'url') {
      const g = platformGuessFromUrl(form.url);
      if (g && !form.platform) setField('platform', g);
    }
    setStep((s) => Math.min(s + 1, ADD_VIDEO_STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="upload-card">
      <h3>Add Single Video</h3>
      <p className="bulk-initiated-hint">
        Fill in the video details below. Platform is auto-detected from URL when possible.
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
    onChange={(e) => {
      const newUrl = e.target.value;
      setField(field.key, newUrl);
      
      // Auto-detect platform from URL
      if (field.key === 'url' && newUrl.trim()) {
        const detectedPlatform = platformGuessFromUrl(newUrl);
        if (detectedPlatform && !form.platform) {
          setField('platform', detectedPlatform);
        }
      }
    }}
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

            {field.type === 'platform' && (
              <select
                id={`video-${field.key}`}
                value={form.platform || ''}
                onChange={(e) => setField('platform', e.target.value)}
              >
                <option value="">Auto (from URL)</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
              </select>
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

export default function BulkUpload() {
  const [tiktokUrls, setTiktokUrls] = useState('');
  const [instagramUrls, setInstagramUrls] = useState('');
  const [initiatedBy, setInitiatedBy] = useState('brand');
  const [file, setFile] = useState(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const submitUrls = async (text, platform) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return toast.error('Paste at least one URL');

    setLoading(true);
    try {
      const urls = lines.map((url) => ({ url, platform }));
      const res = await addBulkVideos({ urls, initiatedBy });
      setResult(res.data);
      toast.success(`Added ${res.data.added} ${platform} videos`);
      if (platform === 'tiktok') setTiktokUrls('');
      else setInstagramUrls('');
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

  const handleSheetSubmit = async () => {
    if (!sheetUrl.trim()) return toast.error('Enter a Google Sheet URL');
    setLoading(true);
    try {
      const res = await importGoogleSheet(sheetUrl.trim());
      setResult(res.data);
      toast.success(`Imported ${res.data.added} videos from Google Sheet`);
      setSheetUrl('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed');
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

      {/* ── TikTok URLs ────────────────── */}
      <div className="upload-card">
        <h3>
          <span className="badge badge-tiktok" style={{ marginRight: 8 }}>TikTok</span>
          Paste TikTok URLs (one per line)
        </h3>
        <textarea
          placeholder={'https://www.tiktok.com/@user/video/123456789\nhttps://www.tiktok.com/@user/video/987654321'}
          value={tiktokUrls}
          onChange={(e) => setTiktokUrls(e.target.value)}
        />
        <button
          className="btn btn-primary mt-12"
          disabled={loading}
          onClick={() => submitUrls(tiktokUrls, 'tiktok')}
        >
          {loading ? 'Submitting…' : 'Submit TikTok URLs'}
        </button>
      </div>

      {/* ── Instagram URLs ─────────────── */}
      <div className="upload-card">
        <h3>
          <span className="badge badge-instagram" style={{ marginRight: 8 }}>Instagram</span>
          Paste Instagram Reel URLs (one per line)
        </h3>
        <textarea
          placeholder={'https://www.instagram.com/reel/ABC123/\nhttps://www.instagram.com/reel/XYZ789/'}
          value={instagramUrls}
          onChange={(e) => setInstagramUrls(e.target.value)}
        />
        <button
          className="btn btn-primary mt-12"
          disabled={loading}
          onClick={() => submitUrls(instagramUrls, 'instagram')}
        >
          {loading ? 'Submitting…' : 'Submit Instagram URLs'}
        </button>
      </div>

      {/* ── Upload Excel ───────────────── */}
      {/* <div className="upload-card">
        <h3>Upload Excel File (.xlsx)</h3>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 12 }}>
          Required: URL. Optional: Creator, Campaign, Platform, InitiatedBy, Created By, Publish Date,
          Influencer Name, Influencer Handle, LOB, Video Duration, Total Cost, Coupon code used, Sales.
        </p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button
          className="btn btn-primary mt-12"
          disabled={loading || !file}
          onClick={handleFileSubmit}
        >
          {loading ? 'Uploading…' : 'Upload & Import'}
        </button>
      </div>

      {/* ── Google Sheet ───────────────── */}
      <div className="upload-card">
        <h3>Import from Google Sheet</h3>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 12 }}>
          Sheet must be public. Same columns as Excel (URL required; extended fields optional).
        </p>
        <input
          type="text"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
        />
        <button
          className="btn btn-primary mt-12"
          disabled={loading || !sheetUrl.trim()}
          onClick={handleSheetSubmit}
        >
          {loading ? 'Importing…' : 'Import from Sheet'}
        </button>
      </div> 
    </div>
  );
}
