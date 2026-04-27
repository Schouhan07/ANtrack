import { useLocation, useParams } from 'react-router-dom';

/**
 * Under `/:tenant/*` routes, returns prefix `/${tenant}` and helper for links.
 */
export function useTenantPath() {
  const { tenant } = useParams();
  const location = useLocation();
  const prefix = tenant ? `/${tenant}` : '';
  const asUser = (() => {
    try {
      const q = new URLSearchParams(location.search || '');
      const raw = q.get('asUser');
      return raw ? String(raw).trim() : '';
    } catch {
      return '';
    }
  })();
  const withTenant = (path) => {
    const p = path.startsWith('/') ? path : `/${path}`;
    const base = `${prefix}${p}`;
    return asUser ? `${base}?asUser=${encodeURIComponent(asUser)}` : base;
  };
  return { tenant, prefix, withTenant, asUser };
}
