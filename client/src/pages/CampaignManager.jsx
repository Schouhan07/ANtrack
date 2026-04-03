import React, { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  FiCalendar,
  FiPlus,
  FiChevronDown,
  FiMoreHorizontal,
  FiUsers,
  FiChevronRight,
} from 'react-icons/fi';
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

const SEGMENTS = [
  { id: 'all', label: 'All campaigns' },
  { id: 'active', label: 'Active' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'archived', label: 'Archived' },
];

const SORT_OPTIONS = [
  { id: 'activity', label: 'Latest activity' },
  { id: 'spend', label: 'Highest spend' },
  { id: 'name', label: 'Name (A–Z)' },
];

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function initialsFromName(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function LobAvatar({ name }) {
  return <div className="campaign-card-team-avatar">{initialsFromName(name)}</div>;
}

function buildLobGroups(entries, portfolioSpend) {
  const byLob = {};
  for (const e of entries) {
    const lob = e.lob || 'General';
    if (!byLob[lob]) byLob[lob] = [];
    byLob[lob].push(e);
  }
  const groups = Object.entries(byLob).map(([lob, list]) => {
    const totalSpend = list.reduce((s, c) => s + (Number(c.cost) || 0), 0);
    const times = list.map((c) => new Date(c.dateLive).getTime());
    const lastActivity = Math.max(...times);
    const influencers = [...new Set(list.map((c) => c.influencerName).filter(Boolean))];
    const entryCount = list.length;
    const avgCpa = entryCount > 0 ? totalSpend / entryCount : 0;
    const spendShare = portfolioSpend > 0 ? Math.round((totalSpend / portfolioSpend) * 100) : 0;
    const progress = portfolioSpend > 0 ? Math.min(100, spendShare) : Math.min(100, entryCount * 5);
    const daysSince = Math.floor((Date.now() - lastActivity) / 86400000);
    let status = 'TESTING';
    if (daysSince <= 60) status = 'ACTIVE';
    else if (daysSince > 120) status = 'PAUSED';
    return {
      lob,
      list,
      totalSpend,
      lastActivity,
      influencers,
      entryCount,
      avgCpa,
      progress,
      status,
      daysSince,
    };
  });
  return groups;
}

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
  const [dataLoading, setDataLoading] = useState(true);
  const [segment, setSegment] = useState('all');
  const [sortBy, setSortBy] = useState('activity');
  const [sortOpen, setSortOpen] = useState(false);
  const [cardMenuLob, setCardMenuLob] = useState(null);

  const activeFilters = useCallback(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v;
    });
    return params;
  }, [filters]);

  const load = useCallback(async () => {
    try {
      setDataLoading(true);
      const params = activeFilters();
      const [campRes, sumRes] = await Promise.all([
        fetchCampaigns(params),
        fetchCampaignSummary(params),
      ]);
      setCampaigns(campRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  }, [activeFilters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchInfluencerNames()
      .then((res) => setInfluencerOptions(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!cardMenuLob) return;
    const close = (e) => {
      if (!e.target.closest?.('.campaign-card-menu-root')) setCardMenuLob(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [cardMenuLob]);

  const filteredEntries = useMemo(() => {
    const now = Date.now();
    const d90 = 90 * 86400000;
    const d180 = 180 * 86400000;
    return campaigns.filter((c) => {
      const t = new Date(c.dateLive).getTime();
      const age = now - t;
      if (segment === 'active') return age <= d90;
      if (segment === 'drafts') return !Number(c.cost) || Number(c.cost) === 0;
      if (segment === 'archived') return age > d180;
      return true;
    });
  }, [campaigns, segment]);

  const portfolioSpend = summary?.totalCost ?? 0;

  const lobGroups = useMemo(
    () => buildLobGroups(filteredEntries, portfolioSpend || 1),
    [filteredEntries, portfolioSpend]
  );

  const spendMedian = useMemo(() => {
    if (!lobGroups.length) return 0;
    const sorted = [...lobGroups].map((g) => g.totalSpend).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] || 0;
  }, [lobGroups]);

  const groupsWithStatus = useMemo(() => {
    return lobGroups.map((g) => {
      let status = g.status;
      if (g.totalSpend >= spendMedian && g.totalSpend > 0 && g.status === 'ACTIVE') {
        status = 'SCALING';
      }
      return { ...g, displayStatus: status };
    });
  }, [lobGroups, spendMedian]);

  const sortedGroups = useMemo(() => {
    const g = [...groupsWithStatus];
    if (sortBy === 'spend') {
      g.sort((a, b) => b.totalSpend - a.totalSpend);
    } else if (sortBy === 'name') {
      g.sort((a, b) => a.lob.localeCompare(b.lob));
    } else {
      g.sort((a, b) => b.lastActivity - a.lastActivity);
    }
    return g;
  }, [groupsWithStatus, sortBy]);

  const sortLabel = SORT_OPTIONS.find((o) => o.id === sortBy)?.label || 'Latest activity';

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

  const openAddForLob = (lob) => {
    setForm({ ...emptyForm, lob: LOBS.includes(lob) ? lob : 'General' });
    setEditingId(null);
    setShowForm(true);
    setCardMenuLob(null);
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

  const focusLobInTable = (lob) => {
    setFilters((prev) => ({ ...prev, lob }));
    setCardMenuLob(null);
    requestAnimationFrame(() => {
      document.getElementById('campaign-entries-section')?.scrollIntoView({ behavior: 'smooth' });
    });
    toast.success(`Filtered table to ${lob}`);
  };

  return (
    <div className="campaign-mgmt">
      <div className="campaign-mgmt-header">
        <div>
          <h1 className="campaign-mgmt-title">Campaign management</h1>
          <p className="campaign-mgmt-lead">
            Track, scale, and optimize your marketing initiatives across LOBs and markets.
          </p>
        </div>
        <div className="campaign-mgmt-header-actions">
          <button
            type="button"
            className="btn btn-secondary campaign-mgmt-btn"
            onClick={() => toast('Scheduling tools coming soon')}
          >
            <FiCalendar size={16} />
            Schedule
          </button>
          <button type="button" className="btn btn-primary campaign-mgmt-btn" onClick={openAddForm}>
            <FiPlus size={16} />
            Create campaign
          </button>
        </div>
      </div>

      {dataLoading ? (
        <div className="stats-row campaign-mgmt-kpis">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card stat-card-skeleton" aria-hidden />
          ))}
        </div>
      ) : (
        <div className="stats-row campaign-mgmt-kpis">
          <div className="stat-card stat-card--compact stat-card--txn">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Total spend</div>
            <div className="value">{fmtMoney(summary?.totalCost)}</div>
            <div className="stat-sub">Sum of entry costs</div>
          </div>
          <div className="stat-card stat-card--compact stat-card--ppv">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Avg. cost</div>
            <div className="value">{fmtMoney(summary?.avgCost)}</div>
            <div className="stat-sub">Per tracked entry</div>
          </div>
          <div className="stat-card stat-card--compact stat-card--videos">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Tracked entries</div>
            <div className="value">{fmtMoney(summary?.totalEntries)}</div>
            <div className="stat-sub">Posts in scope</div>
          </div>
          <div className="stat-card stat-card--compact stat-card--influencer">
            <div className="stat-card-accent" aria-hidden />
            <div className="label">Active markets</div>
            <div className="value">{summary?.countries ?? '—'}</div>
            <div className="stat-sub">Distinct countries</div>
          </div>
        </div>
      )}

      <div className="campaign-mgmt-toolbar">
        <div className="creators-ecosystem-segments campaign-mgmt-segments" role="tablist" aria-label="Campaign scope">
          {SEGMENTS.map((seg) => (
            <button
              key={seg.id}
              type="button"
              role="tab"
              aria-selected={segment === seg.id}
              className={`creators-ecosystem-seg ${segment === seg.id ? 'creators-ecosystem-seg--active' : ''}`}
              onClick={() => setSegment(seg.id)}
            >
              {seg.label}
            </button>
          ))}
        </div>
        <div className="campaign-mgmt-sort">
          <span className="campaign-mgmt-sort-label">Sort by</span>
          <div className="campaign-mgmt-sort-dropdown">
            <button
              type="button"
              className="campaign-mgmt-sort-trigger"
              aria-expanded={sortOpen}
              aria-haspopup="listbox"
              onClick={() => setSortOpen((o) => !o)}
            >
              <span>{sortLabel}</span>
              <FiChevronDown size={16} aria-hidden />
            </button>
            {sortOpen && (
              <ul className="campaign-mgmt-sort-list" role="listbox">
                {SORT_OPTIONS.map((opt) => (
                  <li key={opt.id} role="option" aria-selected={sortBy === opt.id}>
                    <button
                      type="button"
                      className="campaign-mgmt-sort-option"
                      onClick={() => {
                        setSortBy(opt.id);
                        setSortOpen(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {sortOpen && (
        <button
          type="button"
          className="campaign-mgmt-sort-backdrop"
          aria-label="Close sort menu"
          onClick={() => setSortOpen(false)}
        />
      )}

      <div className="campaign-mgmt-grid">
        {sortedGroups.length === 0 ? (
          <div className="campaign-mgmt-empty card">
            <p>No campaign groups match this view. Adjust filters below or add entries.</p>
          </div>
        ) : (
          sortedGroups.map((g) => (
            <article key={g.lob} className="campaign-card">
              <div className="campaign-card-inner">
                <div className="campaign-card-top">
                  <div>
                    <div className="campaign-card-title-row">
                      <h2 className="campaign-card-title">{g.lob}</h2>
                      <span className={`campaign-card-badge campaign-card-badge--${g.displayStatus.toLowerCase()}`}>
                        {g.displayStatus}
                      </span>
                    </div>
                    <p className="campaign-card-sub">
                      Targeting: {g.influencers.slice(0, 3).join(', ')}
                      {g.influencers.length > 3 ? ` +${g.influencers.length - 3} creators` : ''}
                      {g.influencers.length === 0 ? '—' : ''}
                    </p>
                  </div>
                  <div className="campaign-card-menu-root">
                    <button
                      type="button"
                      className="campaign-card-more"
                      aria-label="Campaign actions"
                      aria-expanded={cardMenuLob === g.lob}
                      onClick={() => setCardMenuLob((x) => (x === g.lob ? null : g.lob))}
                    >
                      <FiMoreHorizontal size={20} />
                    </button>
                    {cardMenuLob === g.lob && (
                      <ul className="campaign-card-dropdown" role="menu">
                        <li role="none">
                          <button
                            type="button"
                            className="campaign-card-dropdown-item"
                            role="menuitem"
                            onClick={() => focusLobInTable(g.lob)}
                          >
                            Filter table by {g.lob}
                          </button>
                        </li>
                        <li role="none">
                          <button
                            type="button"
                            className="campaign-card-dropdown-item"
                            role="menuitem"
                            onClick={() => openAddForLob(g.lob)}
                          >
                            Add entry ({g.lob})
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                </div>

                <div className="campaign-card-progress-block">
                  <div className="campaign-card-progress-head">
                    <span className="campaign-card-progress-label">Portfolio share</span>
                    <span className="campaign-card-progress-pct">{g.progress}%</span>
                  </div>
                  <div className="campaign-card-progress-track">
                    <div
                      className="campaign-card-progress-fill"
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>
                </div>

                <div className="campaign-card-stats">
                  <div>
                    <p className="campaign-card-stat-label">Total spend</p>
                    <p className="campaign-card-stat-value">{fmtMoney(g.totalSpend)}</p>
                  </div>
                  <div>
                    <p className="campaign-card-stat-label">Entries</p>
                    <p className="campaign-card-stat-value">{g.entryCount}</p>
                  </div>
                  <div>
                    <p className="campaign-card-stat-label">Creators</p>
                    <p className="campaign-card-stat-value campaign-card-stat-value--accent">
                      {g.influencers.length}
                    </p>
                  </div>
                  <div>
                    <p className="campaign-card-stat-label">Avg. CPA</p>
                    <p className="campaign-card-stat-value">{fmtMoney(g.avgCpa)}</p>
                  </div>
                </div>

                <div className="campaign-card-footer">
                  <div className="campaign-card-team">
                    <div className="campaign-card-team-avatars">
                      {g.influencers.slice(0, 4).map((name) => (
                        <LobAvatar key={name} name={name} />
                      ))}
                      {g.influencers.length === 0 && (
                        <div className="campaign-card-team-fallback">
                          <FiUsers size={16} aria-hidden />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="campaign-card-time-label">Last activity</p>
                      <p className="campaign-card-time-value">
                        {g.daysSince === 0 ? 'Today' : `${g.daysSince}d ago`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary campaign-card-manage"
                    onClick={() => focusLobInTable(g.lob)}
                  >
                    <span>Manage campaign</span>
                    <FiChevronRight size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div id="campaign-entries-section" className="campaign-mgmt-entries">
        <div className="campaign-mgmt-entries-head">
          <h2 className="campaign-mgmt-entries-title">Entries &amp; filters</h2>
          <p className="campaign-mgmt-entries-lead">
            Narrow the list, then add or edit rows. Changes refresh the overview above.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="filter-bar">
            <select
              value={filters.country}
              onChange={(e) => handleFilterChange('country', e.target.value)}
            >
              <option value="">All Countries</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={filters.initiatedBy}
              onChange={(e) => handleFilterChange('initiatedBy', e.target.value)}
            >
              <option value="">All Initiated By</option>
              {INITIATED_BY.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>

            <select value={filters.lob} onChange={(e) => handleFilterChange('lob', e.target.value)}>
              <option value="">All LOB</option>
              {LOBS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={filters.influencerName}
              onChange={(e) => handleFilterChange('influencerName', e.target.value)}
            >
              <option value="">All Influencers</option>
              {influencerOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
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

        {showForm && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <h2>{editingId ? 'Edit Entry' : 'Add New Entry'}</h2>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
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
                      <option key={c} value={c}>
                        {c}
                      </option>
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
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>LOB *</label>
                  <select value={form.lob} onChange={(e) => setForm({ ...form, lob: e.target.value })}>
                    {LOBS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
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
                      <td>
                        <strong>{c.influencerName}</strong>
                      </td>
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
    </div>
  );
}
