const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const numberFormat = new Intl.NumberFormat();
const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

export function formatDate(iso) {
  return dateFormat.format(new Date(iso));
}

export function formatDateTime(iso) {
  return dateTimeFormat.format(new Date(iso));
}

export function formatCount(count) {
  return numberFormat.format(count);
}

// "3 minutes ago", "in 2 days", "just now".
export function relativeTime(iso, now = Date.now()) {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeFormat.format(Math.round(seconds / size), unit);
    }
  }
  return 'just now';
}

// example.com/some/page instead of https://example.com/some/page/
export function displayUrl(url) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

const regionNames = new Intl.DisplayNames(undefined, { type: 'region' });

// Cloudflare reports ISO country codes, plus T1 for Tor and XX when it can't tell.
export function countryName(code) {
  if (!code || code === 'XX') return 'Unknown';
  if (code === 'T1') return 'Tor network';
  try {
    return regionNames.of(code);
  } catch {
    return code;
  }
}
