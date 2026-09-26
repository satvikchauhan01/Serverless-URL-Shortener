import { describe, expect, it } from 'vitest';
import { aliasError, checkUrl } from '../../src/lib/validation.js';

const HOST = 'short.test';

describe('checkUrl', () => {
  it.each([
    ['https://example.com/page?q=1', 'https://example.com/page?q=1'],
    ['example.com/page', 'https://example.com/page'],
    ['  example.com  ', 'https://example.com/'],
    ['example.com:8080/docs', 'https://example.com:8080/docs'],
  ])('accepts %j as %j', (input, url) => {
    expect(checkUrl(input, HOST)).toEqual({ url });
  });

  it.each([
    ['', 'Enter a URL'],
    ['javascript:alert(1)', "doesn't look like a web address"],
    ['ftp://example.com/file', 'Only http and https'],
    ['localhost:3000', 'full web address'],
    ['https://paypal.com@evil.example', 'username or password'],
    ['https://short.test/abc1234', 'already a short link'],
    [`https://example.com/${'a'.repeat(2048)}`, 'at most 2048'],
  ])('rejects %j', (input, message) => {
    expect(checkUrl(input, HOST).error).toContain(message);
  });
});

describe('aliasError', () => {
  it('accepts letters, numbers, dashes and underscores', () => {
    expect(aliasError('my-link_2')).toBeNull();
  });

  it.each([
    ['ab', 'At least 3'],
    ['a'.repeat(33), 'At most 32'],
    ['no spaces', 'Only letters'],
  ])('explains what is wrong with %j', (alias, message) => {
    expect(aliasError(alias)).toContain(message);
  });
});
