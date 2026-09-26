import { describe, expect, it } from 'vitest';
import { isExpired, parseExpiry, toIsoString, unixSeconds } from '../../src/lib/time.js';

const NOW = Date.parse('2026-09-25T12:00:00Z');

describe('parseExpiry', () => {
  it.each([undefined, null])('reads %s as "never expires"', (value) => {
    expect(parseExpiry(value, NOW)).toBeNull();
  });

  it.each([
    ['2026-12-31T23:59:00Z', '2026-12-31T23:59:00.000Z'],
    ['2026-12-31T23:59:30.250Z', '2026-12-31T23:59:30.000Z'],
    ['2026-10-01T09:00:00+05:30', '2026-10-01T03:30:00.000Z'],
    ['2026-10-01', '2026-10-01T00:00:00.000Z'],
  ])('reads %s as %s', (input, expected) => {
    expect(toIsoString(parseExpiry(input, NOW))).toBe(expected);
  });

  it.each(['2026-09-25T12:00:00Z', '2026-09-25T11:59:59Z', '2020-01-01'])(
    'rejects %s because it is not in the future',
    (input) => {
      expect(() => parseExpiry(input, NOW)).toThrow(
        expect.objectContaining({
          status: 400,
          code: 'invalid_expiry',
          message: 'The expiry date has to be in the future.',
        }),
      );
    },
  );

  it.each(['tomorrow', '12/31/2026', '2026-12-31 23:59', '2026-13-45', '', 1798761600, {}])(
    'rejects %j because it is not an ISO 8601 date',
    (input) => {
      expect(() => parseExpiry(input, NOW)).toThrow(
        expect.objectContaining({
          code: 'invalid_expiry',
          message: expect.stringContaining('ISO 8601'),
        }),
      );
    },
  );
});

describe('isExpired', () => {
  const now = unixSeconds(NOW);

  it('never expires a link without an expiry', () => {
    expect(isExpired(null, now)).toBe(false);
  });

  it('expires a link at its expiry second', () => {
    expect(isExpired(now, now)).toBe(true);
  });

  it('keeps a link alive until then', () => {
    expect(isExpired(now + 1, now)).toBe(false);
  });
});
