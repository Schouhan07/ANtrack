const { buildInsightsContext } = require('../services/insightsContext');
const { generateInsightsWithGemini } = require('../services/geminiInsights');
const { hashContext, loadCached, saveCached } = require('../services/insightCacheService');

const MODEL_LABEL = () => process.env.GEMINI_MODEL || 'gemini-2.0-flash';

/**
 * GET /api/insights — Gemini insights; on failure returns last cached payload if available.
 */
exports.getInsights = async (req, res) => {
  try {
    const context = await buildInsightsContext(req.tenantId);
    if (!context.metricRowsCount && !context.activeVideoCount) {
      return res.json({
        insights: [],
        generatedAt: context.generatedAt,
        empty: true,
        message: 'Add active videos and run a scrape to generate insights.',
      });
    }

    const contextHash = hashContext(context);
    const model = MODEL_LABEL();

    try {
      const insights = await generateInsightsWithGemini(context);
      const generatedAt = new Date();
      await saveCached({
        insights,
        model,
        contextHash,
        generatedAt,
        tenantKey: req.tenantId,
      });
      return res.json({
        insights,
        generatedAt: generatedAt.toISOString(),
        model,
        fromCache: false,
      });
    } catch (err) {
      const cached = await loadCached(req.tenantId);
      if (cached && Array.isArray(cached.insights) && cached.insights.length > 0) {
        console.error(
          '[insights] Live Gemini request failed; serving cached insights.',
          err.message || err,
          err.stack || ''
        );
        return res.json({
          insights: cached.insights,
          generatedAt: cached.generatedAt
            ? new Date(cached.generatedAt).toISOString()
            : null,
          model: cached.model || model,
          fromCache: true,
          contextMismatch: Boolean(
            cached.contextHash && cached.contextHash !== contextHash
          ),
        });
      }

      const status = err.statusCode || 500;
      const payload = { error: err.message || 'Insights generation failed' };
      if (err.detail) payload.detail = err.detail;
      return res.status(status).json(payload);
    }
  } catch (err) {
    res.status(500).json({ error: err.message || 'Insights failed' });
  }
};
