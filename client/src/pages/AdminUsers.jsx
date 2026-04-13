import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createAdminUser, listAdminUsers, updateAdminUser } from '../services/api';

export default function AdminUsers() {
  const [data, setData] = useState({ users: [], tenants: [] });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    tenantIds: 'default',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listAdminUsers();
      setData({ users: res.data.users || [], tenants: res.data.tenants || [] });
    } catch (e) {
      toast.error(e.response?.data?.error || 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const tenantIds = form.tenantIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await createAdminUser({
        email: form.email,
        password: form.password,
        name: form.name,
        role: 'user',
        tenantIds,
      });
      toast.success('User created');
      setForm({
        email: '',
        password: '',
        name: '',
        tenantIds: 'default',
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  const toggleActive = async (u) => {
    try {
      await updateAdminUser(u.id, { active: !u.active });
      toast.success(u.active ? 'User disabled' : 'User enabled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="admin-users-page" style={{ maxWidth: 960, padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/default" className="btn btn-secondary">
          Open data workspace (pick tenant in URL, e.g. /sgmy)
        </Link>
      </div>

      <h1 style={{ marginBottom: 8 }}>All users</h1>
      <p className="muted-caption" style={{ marginBottom: 24 }}>
        Most accounts are created when you approve an access request. Use manual invite only for
        exceptions (e.g. backup admin).
      </p>

      <details className="card" style={{ padding: 20, marginBottom: 24 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          Manual invite (emergency / backup admin)
        </summary>
        <form onSubmit={handleCreate} className="admin-user-form" style={{ marginTop: 16 }}>
          <div className="admin-form-row">
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="admin-form-row" style={{ marginTop: 12 }}>
            <input
              placeholder="Tenants: sgmy, kh (comma-separated)"
              value={form.tenantIds}
              onChange={(e) => setForm((f) => ({ ...f, tenantIds: e.target.value }))}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">
              Create
            </button>
          </div>
        </form>
      </details>

      {loading ? (
        <p className="muted-caption">Loading…</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Tenants / regions</th>
                <th>Last login</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    {u.role === 'super_admin'
                      ? '—'
                      : (u.tenantLabels || []).map((t) => t.label).join(', ') || '—'}
                  </td>
                  <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</td>
                  <td>
                    {u.role !== 'super_admin' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => toggleActive(u)}
                      >
                        {u.active ? 'Disable' : 'Enable'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
