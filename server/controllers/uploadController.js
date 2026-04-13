const XLSX = require('xlsx');
const Video = require('../models/Video');
const { buildVideoCreatePayload } = require('../utils/videoPayload');

/**
 * Map a spreadsheet row (Excel / CSV) to the shape expected by buildVideoCreatePayload.
 */
function rowToVideoRaw(row) {
  const url =
    row.URL || row.url || row.Url || row.link || row.Link || '';
  const initiatedRaw =
    row.InitiatedBy ||
    row.initiatedBy ||
    row['Initiated by'] ||
    row['initiated by'] ||
    '';
  const initiatedBy =
    String(initiatedRaw).toLowerCase() === 'supply' ? 'supply' : 'brand';

  return {
    url: String(url).trim(),
    creator: row.Creator || row.creator || row.Name || row.name || '',
    campaign: row.Campaign || row.campaign || '',
    platform: row.Platform || row.platform || '',
    initiatedBy,
    createdBy:
      row['Created By'] || row.createdBy || row.CreatedBy || '',
    publishDate:
      row['Publish Date'] ||
      row.publishDate ||
      row.PublishDate ||
      '',
    influencerName:
      row['Influencer Name'] ||
      row.influencerName ||
      row.InfluencerName ||
      '',
    influencerHandle:
      row['Influencer Handle'] ||
      row.influencerHandle ||
      row.Handle ||
      row.handle ||
      '',
    lob: row.LOB || row.lob || '',
    videoDuration:
      row['Video Duration'] ||
      row.videoDuration ||
      row.Duration ||
      '',
    totalCost:
      row['Total Cost'] || row.totalCost || row.Cost || row.cost || '',
    offerCode:
      row['Coupon code used'] ||
      row.offerCode ||
      row.couponCode ||
      row['Offer code'] ||
      '',
    sales: row.Sales || row.sales || '',
  };
}

/**
 * POST /api/upload/excel
 * Parse uploaded Excel file and bulk-insert videos.
 * Columns: URL (required), Creator, Campaign, Platform (tiktok|instagram|facebook), InitiatedBy,
 * Created By, Publish Date, Influencer Name, Influencer Handle, LOB, Video Duration, Total Cost,
 * Coupon code used, Sales.
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
      const raw = rowToVideoRaw(row);
      const payload = buildVideoCreatePayload(raw, { tenantId: req.tenantId });
      if (!payload) continue;

      try {
        await Video.create(payload);
        results.added++;
      } catch (err) {
        if (err.code === 11000) {
          results.duplicates++;
        } else {
          results.errors.push(`Row "${raw.url}": ${err.message}`);
        }
      }
    }

    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
