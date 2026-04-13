import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  approveAccessApplication,
  listAccessApplications,
  rejectAccessApplication,
} from '../../services/api';

export default function AdminApplications() {
  const [filter, setFilter] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAccessApplications(
        filter === 'all' ? {} : { status: filter }
      );
      setRows(res.data.applications || []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not load requests');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id) => {
    try {
      await approveAccessApplication(id);
      toast.success('Approved — user can sign in');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Approve failed');
    }
  };

  const submitReject = async () => {
    if (!rejectId) return;
    try {
      await rejectAccessApplication(rejectId, { adminNote: rejectNote });
      toast.success('Request rejected');
      setRejectId(null);
      setRejectNote('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Reject failed');
    }
  };

  return (
    <div className="admin-applications" style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ marginBottom: 8 }}>Access requests</h1>
      <p className="muted-caption" style={{ marginBottom: 20 }}>
        Approve to create the account with the regions they selected. Set{' '}
        <code>ADMIN_NOTIFY_EMAIL</code> on the server when you add email alerts.
      </p>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['pending', 'approved', 'rejected', 'all'].map((f) => (
          <button
            key={f}
            type="button"
            className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted-caption">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="muted-caption">No requests in this view.</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Regions</th>
                <th>Status</th>
                <th>Submitted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td>{r.name || '—'}</td>
                  <td>
                    {(r.tenantLabels || []).map((x) => x.label).join(', ') || '—'}
                  </td>
                  <td>{r.status}</td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                  <td>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => approve(r.id)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setRejectId(r.id)}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {r.status === 'rejected' && r.adminNote && (
                      <span className="muted-caption" title={r.adminNote}>
                        Note: {r.adminNote}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejectId && (
        <div className="admin-reject-modal" role="dialog" aria-modal>
          <div className="admin-reject-modal-inner card">
            <h2 style={{ fontSize: '1rem', marginBottom: 12 }}>Reject request</h2>
            <label className="login-label">
              Optional note (shown internally)
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setRejectId(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={submitReject}>
                Confirm reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
