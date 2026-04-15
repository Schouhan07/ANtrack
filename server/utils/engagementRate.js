/**
 * (likes + shares + saves [+ comments]) / views as a percentage, floored at 0.
 * Raw metrics can produce a negative numerator when counts are revised down between scrapes.
 */
function engagementRatePct(numerator, views, fractionDigits = 2) {
  const v = Number(views);
  if (!Number.isFinite(v) || v <= 0) return 0;
  const n = Number(numerator);
  const sum = Number.isFinite(n) ? n : 0;
  const pct = (sum / v) * 100;
  const rounded = Number(pct.toFixed(fractionDigits));
  return Math.max(0, rounded);
}

module.exports = { engagementRatePct };
