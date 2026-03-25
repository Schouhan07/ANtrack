const XLSX = require('xlsx');
const Video = require('../models/Video');

/**
 * POST /api/upload/excel
 * Parse uploaded Excel file and bulk-insert videos.
 * Expected columns: URL, Creator, Campaign, Platform. Optional: InitiatedBy (brand or supply).
 */
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    const results = { added: 0, duplicates: 0, errors: [] };

    for (const row of rows) {
      // Support common column name variations
      const url =
        row.URL || row.url || row.Url || row.link || row.Link || '';
      const creator =
        row.Creator || row.creator || row.Name || row.name || '';
      const campaign =
        row.Campaign || row.campaign || '';
      const platform =
        row.Platform || row.platform || '';
      const initiatedRaw =
        row.InitiatedBy ||
        row.initiatedBy ||
        row['Initiated by'] ||
        row['initiated by'] ||
        '';
      const initiatedBy =
        String(initiatedRaw).toLowerCase() === 'supply' ? 'supply' : 'brand';

      if (!url.trim()) continue;

      try {
        await Video.create({
          url: url.trim(),
          creator: creator.toString().trim(),
          campaign: campaign.toString().trim(),
          platform: platform.toString().trim().toLowerCase() || undefined,
          initiatedBy,
        });
        results.added++;
      } catch (err) {
        if (err.code === 11000) {
          results.duplicates++;
        } else {
          results.errors.push(`Row "${url}": ${err.message}`);
        }
      }
    }

    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/upload/google-sheet
 * Accept a Google Sheets published CSV URL, fetch it, and insert rows.
 */
exports.importGoogleSheet = async (req, res) => {
  try {
    const { sheetUrl } = req.body;
    if (!sheetUrl) {
      return res.status(400).json({ error: 'sheetUrl is required' });
    }

    // Convert share URL → CSV export URL
    const csvUrl = convertToCsvUrl(sheetUrl);

    const axios = require('axios');
    const { data: csvText } = await axios.get(csvUrl);

    const workbook = XLSX.read(csvText, { type: 'string' });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

    const results = { added: 0, duplicates: 0, errors: [] };

    for (const row of rows) {
      const url = row.URL || row.url || row.Url || row.link || '';
      const creator = row.Creator || row.creator || row.Name || '';
      const campaign = row.Campaign || row.campaign || '';
      const platform = row.Platform || row.platform || '';
      const initiatedRaw =
        row.InitiatedBy ||
        row.initiatedBy ||
        row['Initiated by'] ||
        '';
      const initiatedBy =
        String(initiatedRaw).toLowerCase() === 'supply' ? 'supply' : 'brand';

      if (!url.trim()) continue;

      try {
        await Video.create({
          url: url.trim(),
          creator: creator.toString().trim(),
          campaign: campaign.toString().trim(),
          platform: platform.toString().trim().toLowerCase() || undefined,
          initiatedBy,
        });
        results.added++;
      } catch (err) {
        if (err.code === 11000) {
          results.duplicates++;
        } else {
          results.errors.push(`Row "${url}": ${err.message}`);
        }
      }
    }

    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Turn a Google Sheets URL into its CSV export endpoint.
 * Supports /edit, /view, and /pub links.
 */
function convertToCsvUrl(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error('Invalid Google Sheets URL');
  const id = match[1];

  // Extract gid (sheet id) if present
  const gidMatch = url.match(/gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}
