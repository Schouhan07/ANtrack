/**
 * Hook for new access requests. Wire SMTP / SendGrid etc. via env when ready.
 * @param {{ type: string, email: string, name?: string, tenantIds: string[], applicationId: string }} payload
 */
function notifyAdminNewAccessRequest(payload) {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  const line = `[ANTrack] New access request: ${payload.email} (${payload.name || '—'}) → tenants: ${payload.tenantIds.join(', ')}`;
  console.log(line);
  if (to) {
    console.log(`[notifyAdmin] TODO: email ${to} — ${line} (id=${payload.applicationId})`);
  }
}

module.exports = { notifyAdminNewAccessRequest };
