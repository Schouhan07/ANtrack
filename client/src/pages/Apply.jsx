import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchTenantsMeta, submitAccessRequest } from '../services/api';
import AuthPageShell from '../components/auth/AuthPageShell';

export default function Apply() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);

  useEffect(() => {
    fetchTenantsMeta()
      .then((res) => setTenants(res.data.tenants || []))
      .catch(() => toast.error('Could not load regions'))
      .finally(() => setMetaLoading(false));
  }, []);

  const toggleTenant = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.size === 0) {
      toast.error('Choose at least one country / region');
      return;
    }
    setLoading(true);
    try {
      const { data } = await submitAccessRequest({
        email,
        password,
        name,
        tenantIds: [...selected],
      });
      toast.success(data.message || 'Request submitted');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Submit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      backTo="/login"
      backLabel="Back to sign in"
      heroTitle="Request access to your"
      heroHighlight="team workspace."
      heroSubtitle="Choose the regions you need. After an administrator approves your request, you can sign in with the same email and password you set here."
      pillars={[
        { title: 'Approval', text: 'One admin reviews each request before access is granted' },
        { title: 'Regions', text: 'Pick only the markets you work in' },
      ]}
      wideCard
    >
      <div className="auth-form-head">
        <h2 className="auth-form-title">Request access</h2>
        <p className="auth-form-subtitle">
          Create the login you will use after approval. Minimum 8 characters for password.
        </p>
      </div>

      <div className="auth-divider">
        <span className="auth-divider-line" />
        <span className="auth-divider-label">Your details</span>
        <span className="auth-divider-line" />
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field" htmlFor="apply-name">
          <span className="auth-field-label">Name (optional)</span>
          <div className="auth-input-wrap">
            <input
              id="apply-name"
              className="auth-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
        </label>
        <label className="auth-field" htmlFor="apply-email">
          <span className="auth-field-label">Work email</span>
          <div className="auth-input-wrap">
            <input
              id="apply-email"
              className="auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />
          </div>
        </label>
        <label className="auth-field" htmlFor="apply-password">
          <span className="auth-field-label">Password</span>
          <div className="auth-input-wrap">
            <input
              id="apply-password"
              className="auth-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              placeholder="••••••••"
              required
            />
          </div>
          <p className="auth-field-hint">At least 8 characters. You will use this password after approval.</p>
        </label>

        <div className="auth-field">
          <span className="auth-field-label">Country / region access</span>
          {metaLoading ? (
            <p className="auth-field-hint-muted">Loading regions…</p>
          ) : (
            <ul className="auth-region-list">
              {tenants.map((t) => (
                <li key={t.id}>
                  <label className="auth-region-item">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleTenant(t.id)}
                    />
                    <span>
                      <strong className="auth-region-name">{t.label}</strong>
                      <span className="auth-region-meta"> ({t.regions})</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="submit" className="auth-btn-primary" disabled={loading}>
          {loading ? 'Submitting…' : 'Submit for approval'}
        </button>
      </form>

      <p className="auth-form-footer">
        Already have an account?{' '}
        <Link to="/login" className="auth-link">
          Sign in
        </Link>
      </p>
      <p className="auth-legal">
        By submitting, you confirm your organisation is authorised to request access. An administrator
        must approve before any data is visible.
      </p>
    </AuthPageShell>
  );
}
