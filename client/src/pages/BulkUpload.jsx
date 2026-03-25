import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { addBulkVideos, uploadExcel, importGoogleSheet } from '../services/api';

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
      <div className="upload-card">
        <h3>Upload Excel File (.xlsx)</h3>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 12 }}>
          Columns: URL, Creator, Campaign, Platform (tiktok or instagram). Optional: InitiatedBy
          (brand or supply).
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
          Sheet must be public. Columns: URL, Creator, Campaign, Platform. Optional: InitiatedBy
          (brand or supply).
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
