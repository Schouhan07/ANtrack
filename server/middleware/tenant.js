const { isValidTenantId } = require('../config/tenants');
const { authDisabled } = require('./auth');

const DEFAULT_TENANT = () => process.env.DEFAULT_TENANT_ID || 'default';

/**
 * Sets req.tenantId. Super admins must send X-Tenant-Id for scoped data routes.
 * Normal users: header optional if it matches an assigned tenant; else first assigned tenant is used.
 */
function resolveTenant(req, res, next) {
  const raw = req.headers['x-tenant-id'];
  const headerTenant = typeof raw === 'string' ? raw.trim() : '';

  if (authDisabled()) {
    if (headerTenant && isValidTenantId(headerTenant)) {
      req.tenantId = headerTenant;
    } else {
      req.tenantId = DEFAULT_TENANT();
    }
    return next();
  }

  if (req.user.role === 'super_admin') {
    if (!headerTenant || !isValidTenantId(headerTenant)) {
      return res.status(400).json({
        error: 'X-Tenant-Id header required with a valid tenant slug (e.g. sgmy, kh, default)',
      });
    }
    req.tenantId = headerTenant;
    return next();
  }

  const allowed = req.user.tenantIds || [];
  if (allowed.length === 0) {
    return res.status(403).json({ error: 'No tenant access assigned. Contact an administrator.' });
  }

  if (headerTenant) {
    if (!isValidTenantId(headerTenant)) {
      return res.status(400).json({ error: 'Invalid X-Tenant-Id' });
    }
    if (!allowed.includes(headerTenant)) {
      return res.status(403).json({ error: 'You do not have access to this tenant' });
    }
    req.tenantId = headerTenant;
    return next();
  }

  req.tenantId = allowed[0];
  next();
}

module.exports = { resolveTenant };
