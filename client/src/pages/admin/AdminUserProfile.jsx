import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getAdminUser } from '../../services/api';

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString();
  } catch {
    return '—';
  }
}

export default function AdminUserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminUser(id)
      .then((res) => {
        if (!cancelled) setUser(res.data || null);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err.response?.data?.error || 'Could not load user profile');
        navigate('/admin/users', { replace: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const userTenants = useMemo(() => {
    if (!user) return [];
    return user.tenantLabels || [];
  }, [user]);

  if (loading) return <p className="muted-caption">Loading user profile…</p>;
  if (!user) return <p className="muted-caption">User not found.</p>;

  return (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <div style={{ marginBottom: 16 }}>
        <Link to="/admin/users" className="btn btn-secondary">
          ← Back to all users
        </Link>
      </div>

      <h1 style={{ marginBottom: 8 }}>User profile</h1>
      <p className="muted-caption" style={{ marginBottom: 20 }}>
        Open this user&apos;s country dashboard context. Data remains country-scoped.
      </p>

      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          <div>
            <strong>Name:</strong> {user.name || '—'}
          </div>
          <div>
            <strong>Role:</strong> {user.role}
          </div>
          <div>
            <strong>Status:</strong> {user.active ? 'Active' : 'Disabled'}
          </div>
          <div>
            <strong>Created:</strong> {fmtDate(user.createdAt)}
          </div>
          <div>
            <strong>Last login:</strong> {fmtDate(user.lastLoginAt)}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ marginBottom: 12, fontSize: '1.05rem' }}>Country access and dashboard links</h2>
        {userTenants.length === 0 ? (
          <p className="muted-caption">No countries assigned.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {userTenants.map((t) => (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  borderRadius: 12,
                  padding: '10px 12px',
                }}
              >
                <div>
                  <strong>{t.label}</strong>
                  <span className="muted-caption" style={{ marginLeft: 8 }}>
                    ({t.id})
                  </span>
                </div>
                <Link to={`/${t.id}?asUser=${encodeURIComponent(user.id)}`} className="btn btn-primary btn-sm">
                  Open dashboard
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
