import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  fetchCampaigns,
  fetchCampaignSummary,
  fetchInfluencerNames,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from '../services/api';

const COUNTRIES = ['SG', 'MY', 'KH'];
const INITIATED_BY = ['Brand', 'Supply'];
const LOBS = ['Bus', 'Ferry', 'TTD', 'General'];

const emptyForm = {
  country: 'MY',
  initiatedBy: 'Brand',
  lob: 'Bus',
  influencerName: '',
  url: '',
  cost: '',
  dateLive: '',
  summary: '',
};

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [influencerOptions, setInfluencerOptions] = useState([]);
  const [filters, setFilters] = useState({
    country: '',
    initiatedBy: '',
    lob: '',
    influencerName: '',
    from: '',
    to: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const activeFilters = useCallback(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v;
    });
    return params;
  }, [filters]);

  const load = useCallback(async () => {
    try {
      const params = activeFilters();
      const [campRes, sumRes] = await Promise.all([
        fetchCampaigns(params),
        fetchCampaignSummary(params),
      ]);
      setCampaigns(campRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      console.error(err);
    }
  }, [activeFilters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetchInfluencerNames()
      .then((res) => setInfluencerOptions(res.data))
      .catch(console.error);
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ country: '', initiatedBy: '', lob: '', influencerName: '', from: '', to: '' });
  };

  const openAddForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (c) => {
    setForm({
      country: c.country,
      initiatedBy: c.initiatedBy,
      lob: c.lob,
      influencerName: c.influencerName,
      url: c.url,
      cost: c.cost || '',
      dateLive: c.dateLive ? c.dateLive.slice(0, 10) : '',
      summary: c.summary || '',
    });
    setEditingId(c._id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.influencerName || !form.url || !form.dateLive) {
      return toast.error('Influencer Name, URL and Date Live are required');
    }

    setLoading(true);
    try {
      const payload = { ...form, cost: Number(form.cost) || 0 };
      if (editingId) {
        await updateCampaign(editingId, payload);
        toast.success('Campaign updated');
      } else {
        await createCampaign(payload);
        toast.success('Campaign added');
      }
      setShowForm(false);
      setEditingId(null);
      load();
      fetchInfluencerNames().then((res) => setInfluencerOptions(res.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign entry?')) return;
    try {
      await deleteCampaign(id);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Campaign Manager</h1>
        <button className="btn btn-primary" onClick={openAddForm}>
          + Add Entry
        </button>
      </div>

      {/* ── Summary Stats ──────────────── */}
      {summary && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="label">Total Entries</div>
            <div className="value">{summary.totalEntries}</div>
          </div>
          <div className="stat-card">
            <div className="label">Total Cost</div>
            <div className="value">{Number(summary.totalCost).toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="label">Avg Cost</div>
            <div className="value">{Number(summary.avgCost).toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="label">Countries</div>
            <div className="value">{summary.countries}</div>
          </div>
        </div>
      )}

      {/* ── Filter Bar ─────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="filter-bar">
          <select
            value={filters.country}
            onChange={(e) => handleFilterChange('country', e.target.value)}
          >
            <option value="">All Countries</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={filters.initiatedBy}
            onChange={(e) => handleFilterChange('initiatedBy', e.target.value)}
          >
            <option value="">All Initiated By</option>
            {INITIATED_BY.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>

          <select
            value={filters.lob}
            onChange={(e) => handleFilterChange('lob', e.target.value)}
          >
            <option value="">All LOB</option>
            {LOBS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <select
            value={filters.influencerName}
            onChange={(e) => handleFilterChange('influencerName', e.target.value)}
          >
            <option value="">All Influencers</option>
            {influencerOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.from}
            onChange={(e) => handleFilterChange('from', e.target.value)}
            placeholder="From"
          />

          <input
            type="date"
            value={filters.to}
            onChange={(e) => handleFilterChange('to', e.target.value)}
            placeholder="To"
          />

          <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>

      {/* ── Add / Edit Form ────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2>{editingId ? 'Edit Entry' : 'Add New Entry'}</h2>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => { setShowForm(false); setEditingId(null); }}
            >
              Cancel
            </button>
          </div>
          <form onSubmit={handleSubmit} className="campaign-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Country *</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Initiated By *</label>
                <select
                  value={form.initiatedBy}
                  onChange={(e) => setForm({ ...form, initiatedBy: e.target.value })}
                >
                  {INITIATED_BY.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>LOB *</label>
                <select
                  value={form.lob}
                  onChange={(e) => setForm({ ...form, lob: e.target.value })}
                >
                  {LOBS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Influencer Name *</label>
                <input
                  type="text"
                  value={form.influencerName}
                  onChange={(e) => setForm({ ...form, influencerName: e.target.value })}
                  placeholder="@creator_handle"
                />
              </div>

              <div className="form-group">
                <label>URL *</label>
                <input
                  type="text"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="form-group">
                <label>Cost</label>
                <input
                  type="number"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Date Live *</label>
                <input
                  type="date"
                  value={form.dateLive}
                  onChange={(e) => setForm({ ...form, dateLive: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Summary / Notes</label>
              <textarea
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Write about this video — content type, performance notes, remarks..."
                style={{
                  width: '100%',
                  minHeight: 80,
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <button className="btn btn-primary mt-12" disabled={loading}>
              {loading ? 'Saving…' : editingId ? 'Update' : 'Add Entry'}
            </button>
          </form>
        </div>
      )}

      {/* ── Data Table ─────────────────── */}
      <div className="card">
        {campaigns.length === 0 ? (
          <div className="empty-state">No campaign entries found.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Initiated By</th>
                  <th>LOB</th>
                  <th>Influencer</th>
                  <th>URL</th>
                  <th>Cost</th>
                  <th>Date Live</th>
                  <th>Summary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <span className="badge badge-country">{c.country}</span>
                    </td>
                    <td>{c.initiatedBy}</td>
                    <td>{c.lob}</td>
                    <td><strong>{c.influencerName}</strong></td>
                    <td className="url-cell">
                      <a href={c.url} target="_blank" rel="noopener noreferrer">
                        {c.url}
                      </a>
                    </td>
                    <td>{Number(c.cost).toLocaleString()}</td>
                    <td>{new Date(c.dateLive).toLocaleDateString()}</td>
                    <td style={{ maxWidth: 200, fontSize: '0.8rem', color: '#555' }}>
                      {c.summary || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => openEditForm(c)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(c._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
