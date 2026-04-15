/**
 * Build consecutive UTC calendar day keys ending today (inclusive), length = dayCount.
 * @param {number} dayCount
 * @returns {string[]} YYYY-MM-DD
 */
function buildUtcDayKeys(dayCount) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const keys = [];
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

/**
 * Forward-fill portfolio totals between scrape days so charts show continuous lines
 * (same totals carry until the next day that has a scrape).
 *
 * @param {{ date: string, views?: number, likes?: number, shares?: number, saves?: number }[]} rows
 * @param {number} dayCount
 * @returns {{ date: string, views: number, likes: number, shares: number, saves: number, engagement: number, interpolated: boolean }[]}
 */
function fillDailyPortfolioRows(rows, dayCount) {
  const keys = buildUtcDayKeys(dayCount);
  const map = new Map(rows.map((r) => [r.date, r]));
  const out = [];
  let last = null;

  for (const key of keys) {
    if (map.has(key)) {
      const r = map.get(key);
      const likes = Number(r.likes) || 0;
      const shares = Number(r.shares) || 0;
      const saves = Number(r.saves) || 0;
      last = {
        date: key,
        views: Number(r.views) || 0,
        likes,
        shares,
        saves,
        engagement: likes + shares + saves,
        interpolated: false,
      };
      out.push(last);
    } else if (last) {
      out.push({
        date: key,
        views: last.views,
        likes: last.likes,
        shares: last.shares,
        saves: last.saves,
        engagement: last.engagement,
        interpolated: true,
      });
    }
  }

  return out;
}

/**
 * Recharts Line/Area need at least two points to draw a segment; duplicate single-week data.
 * @param {{ weekKey: string, label: string, views: number, engagement: number }[]} data
 */
function padWeeklyTrendIfSingle(data) {
  if (!Array.isArray(data) || data.length !== 1) return data || [];
  const a = data[0];
  return [
    { ...a, weekKey: `${a.weekKey}-a`, label: `${a.label}`, interpolated: false },
    { ...a, weekKey: `${a.weekKey}-b`, label: `${a.label} →`, interpolated: true },
  ];
}

module.exports = {
  buildUtcDayKeys,
  fillDailyPortfolioRows,
  padWeeklyTrendIfSingle,
};
