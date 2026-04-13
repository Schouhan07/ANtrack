import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { loginRequest } from '../services/api';
import AuthPageShell from '../components/auth/AuthPageShell';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await loginRequest(email, password);
      localStorage.setItem('antrack_token', data.token);
      localStorage.setItem('antrack_user', JSON.stringify(data.user));
      toast.success('Signed in');
      if (data.user.role === 'super_admin') {
        navigate('/admin/applications', { replace: true });
      } else if (data.user.tenantIds?.length) {
        navigate(`/${data.user.tenantIds[0]}`, { replace: true });
      } else {
        toast.error('No tenant assigned');
      }
    } catch (err) {
      const code = err.response?.data?.code;
      const msg = err.response?.data?.error || err.message || 'Login failed';
      if (code === 'PENDING_APPROVAL') {
        toast(msg, { icon: '⏳', duration: 6000 });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      backTo="/apply"
      backLabel="Go to request access"
      heroTitle="Welcome back to a"
      heroHighlight="secure workspace."
      heroSubtitle="Sign in to your dashboard. Your data stays scoped to the regions your administrator assigned — clear metrics without the noise."
      pillars={[
        { title: 'Regions', text: 'SG, MY, KH and more — isolated per tenant' },
        { title: 'Reliability', text: 'Scrapes, KPIs, and AI insights in one place' },
      ]}
    >
      <div className="auth-form-head">
        <h2 className="auth-form-title">Sign in</h2>
        <p className="auth-form-subtitle">Use the email and password for your approved account.</p>
      </div>

      <div className="auth-divider">
        <span className="auth-divider-line" />
        <span className="auth-divider-label">Work email</span>
        <span className="auth-divider-line" />
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field" htmlFor="login-email">
          <span className="auth-field-label">Email</span>
          <div className="auth-input-wrap">
            <input
              id="login-email"
              className="auth-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />
          </div>
        </label>
        <label className="auth-field" htmlFor="login-password">
          <span className="auth-field-label auth-field-label-row">
            <span>Password</span>
            <span className="auth-field-hint-muted">Forgot? Contact your admin.</span>
          </span>
          <div className="auth-input-wrap">
            <input
              id="login-password"
              className="auth-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
        </label>
        <button type="submit" className="auth-btn-primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="auth-form-footer">
        Need an account?{' '}
        <Link to="/apply" className="auth-link">
          Request access
        </Link>
      </p>
    </AuthPageShell>
  );
}
