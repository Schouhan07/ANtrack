const XLSX = require('xlsx');
const Video = require('../models/Video');
const { buildVideoCreatePayload } = require('../utils/videoPayload');

/**
 * Map each canonical field to regexes that match the spreadsheet column title.
 * "Total cost" alone is accepted as alias for "Total cost (optional)".
 */
const HEADER_MATCHERS = [
  { key: 'campaignName', headerLabel: 'Campaign name', patterns: [/^\s*campaign\s*name\s*$/i] },
  { key: 'lineOfBusiness', headerLabel: 'Line of business', patterns: [/^\s*line\s*of\s*business\s*$/i] },
  { key: 'tiktok', headerLabel: 'TikTok', patterns: [/^\s*tiktok\s*$/i] },
  { key: 'instagram', headerLabel: 'Instagram', patterns: [/^\s*instagram\s*$/i] },
  { key: 'facebook', headerLabel: 'Facebook', patterns: [/^\s*facebook\s*$/i] },
  { key: 'publishDate', headerLabel: 'Video publish date', patterns: [/^\s*video\s*publish\s*date\s*$/i] },
  { key: 'influencerName', headerLabel: 'Influencer name', patterns: [/^\s*influencer\s*name\s*$/i] },
  {
    key: 'totalCost',
    headerLabel: 'Total cost (optional)',
    patterns: [/^\s*total\s*cost\s*(\(optional\))?\s*$/i, /^\s*total\s*cost\s*optional\s*$/i],
  },
  { key: 'couponCode', headerLabel: 'Coupon code used', patterns: [/^\s*coupon\s*code\s*used\s*$/i] },
];

const EXCEL_IMPORT_HEADERS = HEADER_MATCHERS.map((s) => s.headerLabel);

function normaliseInitiatedBy(v) {
  return String(v || '').toLowerCase() === 'supply' ? 'supply' : 'brand';
}

function urlLines(text) {
  return String(text ?? '')
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Normalize hyperlink / rich / formula cell values from SheetJS. */
function coerceCell(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return v;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object') {
    if (v.l && typeof v.l === 'object' && v.l.Target) return String(v.l.Target).trim();
    if (v.Target) return String(v.Target).trim();
    if (v.hyperlink) return String(v.hyperlink).trim();
    if (v.w != null) return String(v.w).trim();
    if (v.v != null) return coerceCell(v.v);
  }
  return String(v).trim();
}

function excelSerialToISO(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n < 1) return '';
  try {
    const p = XLSX.SSF.parse_date_code(n);
    if (p && p.y) {
      const d = new Date(Date.UTC(p.y, p.m - 1, p.d));
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  } catch (_) {
    /* fall through */
  }
  const d = new Date(Math.round((n - 25569) * 86400 * 1000));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/** Strip common currency prefixes (RM, SGD, $) and parse a number for totalCost. */
function parseMoneyForPayload(raw) {
  const c = coerceCell(raw);
  if (c === '' || c == null) return '';
  const s = String(c).trim().replace(/,/g, '');
  const cleaned = s.replace(/^[\s]*(?:RM|SGD|\$|USD|EUR)\s*/i, '').trim();
  const n = Number(cleaned);
  if (Number.isNaN(n)) return '';
  return String(n);
}

/**
 * Map canonical field -> 0-based column index from the header row (array).
 * @returns {{ colMap: Record<string, number>, error?: string }}
 */
function buildColumnMap(headerRow) {
  const colMap = {};
  if (!Array.isArray(headerRow)) {
    return { colMap: {}, error: 'Invalid sheet layout.' };
  }

  for (let colIdx = 0; colIdx < headerRow.length; colIdx++) {
    let label = String(headerRow[colIdx] ?? '').trim().replace(/^\uFEFF/, '');
    if (!label || /^__empty/i.test(label)) continue;

    let matched = null;
    for (const spec of HEADER_MATCHERS) {
      if (!spec.patterns.some((re) => re.test(label))) continue;
      if (colMap[spec.key] !== undefined) {
        return {
          colMap: {},
          error: `Duplicate column "${spec.headerLabel}".`,
        };
      }
      matched = spec.key;
      break;
    }

    if (!matched) {
      return {
        colMap: {},
        error: `Unexpected column "${label}". Use only: ${EXCEL_IMPORT_HEADERS.join(', ')}.`,
      };
    }

    colMap[matched] = colIdx;
  }

  for (const spec of HEADER_MATCHERS) {
    if (colMap[spec.key] === undefined) {
      return {
        colMap: {},
        error: `Missing column "${spec.headerLabel}".`,
      };
    }
  }

  return { colMap };
}

function padRow(row, minLen) {
  const out = Array.isArray(row) ? [...row] : [];
  while (out.length < minLen) out.push('');
  return out;
}

function getCell(rowArr, colMap, key) {
  const idx = colMap[key];
  if (idx == null || idx < 0) return '';
  const v = rowArr[idx];
  return coerceCell(v);
}

function rowIsBlank(rowArr) {
  if (!rowArr || !rowArr.length) return true;
  return rowArr.every((c) => {
    const x = coerceCell(c);
    return x === '' || x == null;
  });
}

function rowToEntries(rowArr, colMap, defaultInitiatedBy) {
  const campaign = String(getCell(rowArr, colMap, 'campaignName')).trim();
  const lob = String(getCell(rowArr, colMap, 'lineOfBusiness')).trim();
  const publishRaw = getCell(rowArr, colMap, 'publishDate');
  const influencerName = String(getCell(rowArr, colMap, 'influencerName')).trim();
  const totalCostStr = parseMoneyForPayload(getCell(rowArr, colMap, 'totalCost'));
  const offerCode = String(getCell(rowArr, colMap, 'couponCode')).trim();

  let publishDate = '';
  if (publishRaw !== '' && publishRaw != null) {
    if (publishRaw instanceof Date && !Number.isNaN(publishRaw.getTime())) {
      publishDate = publishRaw.toISOString().slice(0, 10);
    } else if (typeof publishRaw === 'number') {
      publishDate = excelSerialToISO(publishRaw);
    } else {
      publishDate = String(publishRaw).trim();
    }
  }

  const tiktokLines = urlLines(String(getCell(rowArr, colMap, 'tiktok')));
  const instagramLines = urlLines(String(getCell(rowArr, colMap, 'instagram')));
  const facebookLines = urlLines(String(getCell(rowArr, colMap, 'facebook')));

  if (
    tiktokLines.length === 0 &&
    instagramLines.length === 0 &&
    facebookLines.length === 0
  ) {
    return { entries: [], skip: true };
  }

  const shared = {
    campaign,
    lob,
    ...(publishDate ? { publishDate } : {}),
    ...(influencerName ? { influencerName } : {}),
    ...(totalCostStr !== '' ? { totalCost: totalCostStr } : {}),
    ...(offerCode ? { offerCode } : {}),
    initiatedBy: defaultInitiatedBy,
  };

  const entries = [
    ...tiktokLines.map((url) => ({ url, platform: 'tiktok', ...shared })),
    ...instagramLines.map((url) => ({ url, platform: 'instagram', ...shared })),
    ...facebookLines.map((url) => ({ url, platform: 'facebook', ...shared })),
  ];

  return { entries, skip: false };
}

/**
 * POST /api/upload/excel
 * First sheet, row 1 = headers (Add videos column set). Data from row 2+.
 * Uses array-of-rows parsing so empty leading cells (e.g. blank Campaign) do not drop columns.
 */
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const defaultInit = normaliseInitiatedBy(req.body?.initiatedBy);

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    });

    if (!aoa || aoa.length < 2) {
      return res.status(400).json({ error: 'Excel file is empty or has no data rows' });
    }

    const headerRow = aoa[0];
    const { colMap, error: headerError } = buildColumnMap(headerRow);
    if (headerError) {
      return res.status(400).json({ error: headerError });
    }

    const maxCol = Math.max(...Object.values(colMap));
    const results = { added: 0, duplicates: 0, errors: [] };

    for (let i = 1; i < aoa.length; i++) {
      const rowNum = i + 1;
      const rowArr = padRow(aoa[i], maxCol + 1);
      if (rowIsBlank(rowArr)) continue;

      const { entries, skip } = rowToEntries(rowArr, colMap, defaultInit);
      if (skip) {
        results.errors.push(`Row ${rowNum}: no URLs in TikTok, Instagram, or Facebook.`);
        continue;
      }

      for (const raw of entries) {
        const payload = buildVideoCreatePayload(raw, {
          defaultInitiatedBy: defaultInit,
          tenantId: req.tenantId,
        });
        if (!payload) {
          results.errors.push(`Row ${rowNum}: empty or invalid URL skipped.`);
          continue;
        }

        try {
          await Video.create(payload);
          results.added++;
        } catch (err) {
          if (err.code === 11000) {
            results.duplicates++;
          } else {
            results.errors.push(`Row ${rowNum} "${raw.url}": ${err.message}`);
          }
        }
      }
    }

    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
