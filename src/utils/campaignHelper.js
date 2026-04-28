const crypto = require('crypto');

exports.generateCampaignCode = (campaignName) => {
  const cleanName = campaignName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 10);

  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return cleanName ? `${cleanName}_${randomSuffix}` : `CAMP_${randomSuffix}`;
};

exports.buildTrackingUrl = (targetUrl, campaignCode) => {
  if (!targetUrl) return null;

  let cleanUrl = targetUrl.trim().replace(/\/+$/, '');

  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`;
  }

  const hasQuery = cleanUrl.includes('?');
  const hasPath = cleanUrl.split('://')[1]?.includes('/');

  if (!hasPath && !hasQuery) {
    cleanUrl += '/';
  }

  const separator = hasQuery ? '&' : '?';

  const utmParams = [
    'utm_source=whatsapp',
    'utm_medium=promotional',
    `utm_campaign=${encodeURIComponent(campaignCode)}`,
  ].join('&');

  return `${cleanUrl}${separator}${utmParams}`;
};

exports.generatePublicToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

exports.extractCampaignCode = (landingSite) => {
  if (!landingSite) return null;

  const match = landingSite.match(/[?&]utm_campaign=([^&]+)/i);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};