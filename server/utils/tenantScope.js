/**
 * @param {import('express').Request} req
 * @param {Record<string, unknown>} [base]
 */
function videoFilter(req, base = {}) {
  return { ...base, tenantId: req.tenantId };
}

module.exports = { videoFilter };
