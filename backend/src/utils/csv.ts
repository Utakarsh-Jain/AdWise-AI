import fs from 'fs';
import csvParser from 'csv-parser';

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
        try {
          // Normalize headers: find matching columns case-insensitively
          const keys = Object.keys(row);
          const findKey = (candidates: string[]) => {
            return keys.find(k => candidates.includes(k.toLowerCase().trim()));
          };

          const dateKey = findKey(['date', 'day']);
          const campaignKey = findKey(['campaign', 'campaign_name', 'name']);
          const platformKey = findKey(['platform', 'channel', 'source']);
          const spendKey = findKey(['spend', 'cost', 'amount']);
          const clicksKey = findKey(['clicks', 'click']);
          const impressionsKey = findKey(['impressions', 'impression', 'views']);
          const conversionsKey = findKey(['conversions', 'conversion', 'leads']);

          if (!dateKey || !campaignKey || !spendKey || !clicksKey || !conversionsKey) {
            errorCount++;
            errors.push(`Row ${totalRows}: Missing required columns (Date, Campaign, Spend, Clicks, Conversions).`);
            return;
          }

          const rawDate = row[dateKey];
          const campaign = row[campaignKey]?.trim();
          let platform = platformKey ? row[platformKey]?.trim() : null;
          const rawSpend = row[spendKey];
          const rawClicks = row[clicksKey];
          const rawImpressions = impressionsKey ? row[impressionsKey] : null;
          const rawConversions = row[conversionsKey];

          // 1. Validate Campaign Name
          if (!campaign) {
            errorCount++;
            errors.push(`Row ${totalRows}: Campaign name is empty.`);
            return;
          }

          // 2. Validate Platform
          if (!platform) {
            platform = inferPlatform(campaign);
          }

          // 3. Validate Date
          const parsedDate = new Date(rawDate);
          if (isNaN(parsedDate.getTime())) {
            errorCount++;
            errors.push(`Row ${totalRows}: Invalid date format "${rawDate}".`);
            return;
          }
          const dateString = parsedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD

          // 4. Validate Numbers
          const spend = parseFloat(rawSpend);
          const clicks = parseInt(rawClicks, 10);
          const conversions = parseInt(rawConversions, 10);
          
          let impressions = rawImpressions ? parseInt(rawImpressions, 10) : 0;
          if (!rawImpressions || isNaN(impressions)) {
            // If impressions missing, fallback to clicks * 15 or clicks + conversions
            impressions = clicks * 15;
          }

          if (isNaN(spend) || spend < 0) {
            errorCount++;
            errors.push(`Row ${totalRows}: Invalid spend value "${rawSpend}". Must be >= 0.`);
            return;
          }
          if (isNaN(clicks) || clicks < 0) {
            errorCount++;
            errors.push(`Row ${totalRows}: Invalid clicks value "${rawClicks}". Must be >= 0.`);
            return;
          }
          if (isNaN(impressions) || impressions < 0) {
            errorCount++;
            errors.push(`Row ${totalRows}: Invalid impressions value. Must be >= 0.`);
            return;
          }
          if (isNaN(conversions) || conversions < 0) {
            errorCount++;
            errors.push(`Row ${totalRows}: Invalid conversions value "${rawConversions}". Must be >= 0.`);
            return;
          }

          // Business validation: clicks cannot exceed impressions, conversions cannot exceed clicks (usually)
          if (clicks > impressions) {
            errorCount++;
            errors.push(`Row ${totalRows}: Clicks (${clicks}) cannot exceed Impressions (${impressions}).`);
            return;
          }
          if (conversions > clicks) {
            errorCount++;
            errors.push(`Row ${totalRows}: Conversions (${conversions}) cannot exceed Clicks (${clicks}).`);
            return;
          }

          // 5. Deduplication
          const dedupeKey = `${campaign.toLowerCase()}_${dateString}`;
          if (uniqueKeys.has(dedupeKey)) {
            // Row is duplicate in this file, we skip it
            return;
          }
          uniqueKeys.add(dedupeKey);

          validRows.push({
            date: dateString,
            campaign,
            platform,
            spend,
            clicks,
            impressions,
            conversions
          });
        } catch (err: any) {
          errorCount++;
          errors.push(`Row ${totalRows}: Unexpected parsing error - ${err.message}`);
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
