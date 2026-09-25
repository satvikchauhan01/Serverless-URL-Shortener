import { describe, expect, it } from 'vitest';
import { MAX_URL_LENGTH, normalizeDestination } from '../../src/lib/urls.js';

const SHORTENER_HOST = 'short.test';

function normalize(input) {
  return normalizeDestination(input, SHORTENER_HOST);
}

describe('normalizeDestination', () => {
  it.each([
    ['https://example.com/page?q=1#top', 'https://example.com/page?q=1#top'],
    ['http://example.com', 'http://example.com/'],
    ['example.com/page', 'https://example.com/page'],
    ['  example.com  ', 'https://example.com/'],
    ['example.com:8080/docs', 'https://example.com:8080/docs'],
    ['HTTPS://Example.COM/CaseKept', 'https://example.com/CaseKept'],
  ])('accepts %j as %j', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it.each([
    ['', 'Enter a URL'],
    ['   ', 'Enter a URL'],
    [undefined, 'Enter a URL'],
    [42, 'Enter a URL'],
    ['https://exa mple.com', "doesn't look like a web address"],
    ['javascript:alert(1)', "doesn't look like a web address"],
    ['data:text/html,<b>hi</b>', "doesn't look like a web address"],
    ['ftp://example.com/file.zip', 'Only http and https'],
    ['localhost:3000', 'full web address'],
    ['https://paypal.com@evil.example', 'username or password'],
    ['mailto:someone@example.com', 'username or password'],
    ['https://short.test/abc1234', 'already a short link'],
  ])('rejects %j', (input, message) => {
    expect(() => normalize(input)).toThrow(
      expect.objectContaining({
        status: 400,
        code: 'invalid_url',
        message: expect.stringContaining(message),
      }),
    );
  });

  it('rejects URLs longer than the limit', () => {
    const tooLong = `https://example.com/${'a'.repeat(MAX_URL_LENGTH)}`;
    expect(() => normalize(tooLong)).toThrow(`at most ${MAX_URL_LENGTH} characters`);
  });
});
