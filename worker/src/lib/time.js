import { ApiError } from './errors.js';

// Dates like 2026-12-31 or 2026-12-31T18:30:00Z. Other formats are ambiguous (is
// 01/02/2027 January or February?), so they are rejected rather than guessed at.
const ISO_8601 = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

export function unixSeconds(ms = Date.now()) {
  return Math.floor(ms / 1000);
}

export function toIsoString(seconds) {
  return new Date(seconds * 1000).toISOString();
}

export function isExpired(expiresAt, now = unixSeconds()) {
  return expiresAt !== null && expiresAt <= now;
}

// Turns an optional ISO 8601 expiry into unix seconds. null means the link never expires.
export function parseExpiry(value, now = Date.now()) {
  if (value === undefined || value === null) return null;

  const ms = typeof value === 'string' && ISO_8601.test(value) ? Date.parse(value) : NaN;
  if (Number.isNaN(ms)) {
    throw new ApiError(
      400,
      'invalid_expiry',
      'Give the expiry as an ISO 8601 date, like 2026-12-31T23:59:00Z.',
    );
  }
  if (ms <= now) {
    throw new ApiError(400, 'invalid_expiry', 'The expiry date has to be in the future.');
  }
  return unixSeconds(ms);
}
