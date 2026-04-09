const { GoogleGenerativeAI } = require('@google/generative-ai');

const DEFAULT_MODEL = 'gemini-2.0-flash';

function stripJsonFence(text) {
  let s = String(text || '').trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m;
  const m = s.match(fence);
  if (m) s = m[1].trim();
  return s;
}

/**
 * @param {object} context - from buildInsightsContext()
 * @returns {Promise<Array<{ insight: string, reason: string, recommendation: string, expectedImpact: string }>>}
 */
async function generateInsightsWithGemini(context) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    const err = new Error('GEMINI_API_KEY is not set');
    err.statusCode = 503;
    throw err;
  }

  const modelName = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `You are a senior performance marketing analyst for influencer campaigns (TikTok & Instagram).

You will receive ONLY this JSON snapshot of tracked content metrics. Rules:
- Do NOT invent statistics. You may interpret trends and name segments (e.g. "TikTok vs Instagram") using ONLY numbers present in the data.
- If a metric is missing or zero, say "limited data" instead of guessing.
- Produce exactly 4 insights. Each must follow: pattern → comparison → actionable recommendation.
- Return ONLY a valid JSON array (no markdown, no commentary) with this exact shape for every item:
  {"insight":"string","reason":"string","recommendation":"string","expectedImpact":"string"}

The "expectedImpact" field should be qualitative or a cautious range (e.g. "Moderate efficiency gain if budget follows engagement") — do not claim precise % unless computed from the data (e.g. you can cite views growth % if present).

DATA:
${JSON.stringify(context, null, 2)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const raw = stripJsonFence(text);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const err = new Error('Gemini returned non-JSON output');
    err.statusCode = 502;
    err.detail = raw.slice(0, 500);
    throw err;
  }

  if (!Array.isArray(parsed)) {
    const err = new Error('Gemini JSON must be an array');
    err.statusCode = 502;
    throw err;
  }

  const cleaned = parsed.map((item, i) => ({
    insight: String(item.insight || `Insight ${i + 1}`).slice(0, 2000),
    reason: String(item.reason || '').slice(0, 4000),
    recommendation: String(item.recommendation || '').slice(0, 2000),
    expectedImpact: String(item.expectedImpact || '').slice(0, 1000),
  }));

  return cleaned;
}

module.exports = { generateInsightsWithGemini, DEFAULT_MODEL };
