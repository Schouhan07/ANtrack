import { useParams } from 'react-router-dom';

/**
 * Under `/:tenant/*` routes, returns prefix `/${tenant}` and helper for links.
 */
export function useTenantPath() {
  const { tenant } = useParams();
  const prefix = tenant ? `/${tenant}` : '';
  const withTenant = (path) => {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${prefix}${p}`;
  };
  return { tenant, prefix, withTenant };
}
