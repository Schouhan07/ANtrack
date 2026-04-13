/**
 * Registry of tenant slugs (URL segment / X-Tenant-Id). Add entries when onboarding a region.
 */
const TENANTS = [
  { id: 'default', label: 'Default', regions: 'Legacy / unassigned' },
  { id: 'sgmy', label: 'Singapore & Malaysia', regions: 'SG, MY' },
  { id: 'kh', label: 'Cambodia', regions: 'KH' },
];

const IDS = new Set(TENANTS.map((t) => t.id));

function isValidTenantId(id) {
  return typeof id === 'string' && IDS.has(id);
}

function listTenants() {
  return TENANTS;
}

function getTenantLabel(id) {
  const t = TENANTS.find((x) => x.id === id);
  return t ? t.label : id;
}

module.exports = {
  TENANTS,
  isValidTenantId,
  listTenants,
  getTenantLabel,
};
