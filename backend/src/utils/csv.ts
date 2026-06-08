import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import * as XLSX from 'xlsx';

export interface CSVRow {
  date: string;
  campaign: string;
  platform: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
}

export interface ParseResult {
  validRows: CSVRow[];
  totalRows: number;
  errorCount: number;
  errors: string[];
}

/**
 * Detects platform name from campaign name if platform is not explicitly provided.
 */
export function inferPlatform(campaignName: string): string {
  const name = campaignName.toLowerCase();
  if (name.includes('google') || name.includes('gdn') || name.includes('sem') || name.includes('yt') || name.includes('youtube')) {
    return 'Google';
  }
  if (name.includes('fb') || name.includes('facebook') || name.includes('instagram') || name.includes('insta') || name.includes('meta') || name.includes('ig')) {
    return 'Meta';
  }
  if (name.includes('linkedin') || name.includes('ln') || name.includes('li')) {
    return 'LinkedIn';
  }
  if (name.includes('tiktok') || name.includes('tt')) {
    return 'TikTok';
  }
  if (name.includes('twitter') || name.includes('x.com')) {
    return 'Twitter/X';
  }
  return 'Other';
}

/**
 * Finds a matching key from the row object, case-insensitively.
 */
function findKey(keys: string[], candidates: string[]): string | undefined {
  return keys.find(k => candidates.includes(k.toLowerCase().trim()));
}

/**
 * Validates and processes a single raw row object.
 * Returns the parsed CSVRow or an error message.
 */
function validateRow(
  row: any,
  rowNumber: number,
  uniqueKeys: Set<string>
): { valid: true; data: CSVRow } | { valid: false; error: string } {
  try {
    const keys = Object.keys(row);

    const dateKey = findKey(keys, ['date', 'day']);
    const campaignKey = findKey(keys, ['campaign', 'campaign_name', 'name']);
    const platformKey = findKey(keys, ['platform', 'channel', 'source']);
    const spendKey = findKey(keys, ['spend', 'cost', 'amount']);
    const clicksKey = findKey(keys, ['clicks', 'click']);
    const impressionsKey = findKey(keys, ['impressions', 'impression', 'views']);
    const conversionsKey = findKey(keys, ['conversions', 'conversion', 'leads']);

    if (!dateKey || !campaignKey || !spendKey || !clicksKey || !conversionsKey) {
      return { valid: false, error: `Row ${rowNumber}: Missing required columns (Date, Campaign, Spend, Clicks, Conversions).` };
    }

    const rawDate = row[dateKey];
    const campaign = String(row[campaignKey] ?? '').trim();
    let platform = platformKey ? String(row[platformKey] ?? '').trim() : null;
    const rawSpend = row[spendKey];
    const rawClicks = row[clicksKey];
    const rawImpressions = impressionsKey ? row[impressionsKey] : null;
    const rawConversions = row[conversionsKey];

    // 1. Validate Campaign Name
    if (!campaign) {
      return { valid: false, error: `Row ${rowNumber}: Campaign name is empty.` };
    }

    // 2. Validate Platform
    if (!platform) {
      platform = inferPlatform(campaign);
    }

    // 3. Validate Date
    let parsedDate: Date;
    // Handle Excel serial date numbers (e.g., 46166 for a date)
    if (typeof rawDate === 'number') {
      // Excel stores dates as serial numbers (days since 1900-01-01, with a bug for 1900-02-29)
      parsedDate = excelSerialToDate(rawDate);
    } else {
      parsedDate = new Date(rawDate);
    }

    if (isNaN(parsedDate.getTime())) {
      return { valid: false, error: `Row ${rowNumber}: Invalid date format "${rawDate}".` };
    }
    const dateString = parsedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // 4. Validate Numbers
    const spend = parseFloat(String(rawSpend));
    const clicks = parseInt(String(rawClicks), 10);
    const conversions = parseInt(String(rawConversions), 10);

    let impressions = rawImpressions != null ? parseInt(String(rawImpressions), 10) : 0;
    if (rawImpressions == null || isNaN(impressions)) {
      // If impressions missing, fallback to clicks * 15
      impressions = clicks * 15;
    }

    if (isNaN(spend) || spend < 0) {
      return { valid: false, error: `Row ${rowNumber}: Invalid spend value "${rawSpend}". Must be >= 0.` };
    }
    if (isNaN(clicks) || clicks < 0) {
      return { valid: false, error: `Row ${rowNumber}: Invalid clicks value "${rawClicks}". Must be >= 0.` };
    }
    if (isNaN(impressions) || impressions < 0) {
      return { valid: false, error: `Row ${rowNumber}: Invalid impressions value. Must be >= 0.` };
    }
    if (isNaN(conversions) || conversions < 0) {
      return { valid: false, error: `Row ${rowNumber}: Invalid conversions value "${rawConversions}". Must be >= 0.` };
    }

    // Business validation: clicks cannot exceed impressions, conversions cannot exceed clicks (usually)
    if (clicks > impressions) {
      return { valid: false, error: `Row ${rowNumber}: Clicks (${clicks}) cannot exceed Impressions (${impressions}).` };
    }
    if (conversions > clicks) {
      return { valid: false, error: `Row ${rowNumber}: Conversions (${conversions}) cannot exceed Clicks (${clicks}).` };
    }

    // 5. Deduplication
    const dedupeKey = `${campaign.toLowerCase()}_${dateString}`;
    if (uniqueKeys.has(dedupeKey)) {
      // Row is duplicate in this file, we skip it
      return { valid: false, error: '' }; // silent skip
    }
    uniqueKeys.add(dedupeKey);

    return {
      valid: true,
      data: {
        date: dateString,
        campaign,
        platform,
        spend,
        clicks,
        impressions,
        conversions
      }
    };
  } catch (err: any) {
    return { valid: false, error: `Row ${rowNumber}: Unexpected parsing error - ${err.message}` };
  }
}

/**
 * Converts an Excel serial date number to a JavaScript Date.
 */
function excelSerialToDate(serial: number): Date {
  // Excel's epoch is 1900-01-01, but it has a leap year bug (counts 1900-02-29 which didn't exist)
  // So for serials > 60, subtract 1 day
  const utcDays = serial - 25569; // 25569 = days between 1900-01-01 and 1970-01-01
  return new Date(utcDays * 86400 * 1000);
}

/**
 * Main entry point: Detects file type and parses accordingly.
 * Supports .csv, .xlsx, and .xls files.
 */
export function parseCampaignFile(filePath: string): Promise<ParseResult> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    return parseExcelFile(filePath);
  }
  return parseCampaignCSV(filePath);
}

/**
 * Parses an Excel (.xlsx / .xls) file using the SheetJS library.
 */
function parseExcelFile(filePath: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        return reject(new Error('File does not exist: ' + filePath));
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Use the first sheet
      if (!sheetName) {
        return reject(new Error('Excel file has no sheets.'));
      }

      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        return resolve({
          validRows: [],
          totalRows: 0,
          errorCount: 0,
          errors: ['Excel sheet is empty or has no data rows.']
        });
      }

      const validRows: CSVRow[] = [];
      const errors: string[] = [];
      let errorCount = 0;
      const uniqueKeys = new Set<string>();

      rows.forEach((row, index) => {
        const rowNumber = index + 1; // 1-indexed for user-friendly messages
        const result = validateRow(row, rowNumber, uniqueKeys);

        if (result.valid) {
          validRows.push(result.data);
        } else if (result.error) {
          // Non-empty error means a real validation failure (not a silent dedup skip)
          errorCount++;
          errors.push(result.error);
        }
      });

      resolve({
        validRows,
        totalRows: rows.length,
        errorCount,
        errors: errors.slice(0, 50) // Limit detailed error log to first 50 rows
      });
    } catch (err: any) {
      reject(new Error('Failed to read Excel file: ' + err.message));
    }
  });
}

/**
 * Parses and validates CSV data.
 */
export function parseCampaignCSV(filePath: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const validRows: CSVRow[] = [];
    const errors: string[] = [];
    let totalRows = 0;
    let errorCount = 0;

    // Track unique campaign + date combinations to deduplicate within the file
    const uniqueKeys = new Set<string>();

    if (!fs.existsSync(filePath)) {
      return reject(new Error('File does not exist: ' + filePath));
    }

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row: any) => {
        totalRows++;
        const result = validateRow(row, totalRows, uniqueKeys);

        if (result.valid) {
          validRows.push(result.data);
        } else if (result.error) {
          errorCount++;
          errors.push(result.error);
        }
      })
      .on('end', () => {
        resolve({
          validRows,
          totalRows,
          errorCount,
          errors: errors.slice(0, 50) // Limit detailed error log to first 50 rows
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}
