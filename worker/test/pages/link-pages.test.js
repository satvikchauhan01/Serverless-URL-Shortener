import { describe, expect, it } from 'vitest';
import { linkExpiredResponse, linkNotFoundResponse } from '../../src/pages/link-pages.js';

const APP_URL = 'https://app.test/';

describe('linkNotFoundResponse', () => {
  it('serves a 404 page with locked-down headers', async () => {
    const res = linkNotFoundResponse({ shortLink: 'short.test/abc1234', appUrl: APP_URL });

    expect(res.status).toBe(404);
    expect(Object.fromEntries(res.headers)).toMatchObject({
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': expect.stringContaining("default-src 'none'"),
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
    });
    const html = await res.text();
    expect(html).toContain('<code>short.test/abc1234</code>');
    expect(html).toContain(`<a href="${APP_URL}">`);
  });

  it('does not echo a path that could never be a short link', async () => {
    const html = await linkNotFoundResponse({ appUrl: APP_URL }).text();

    expect(html).toContain('There is no short link at this address.');
    expect(html).not.toContain('<code>');
  });

  it('escapes everything it prints', async () => {
    const res = linkNotFoundResponse({
      shortLink: '<script>alert(1)</script>',
      appUrl: 'https://app.test/?a="b"&c',
    });
    const html = await res.text();

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('href="https://app.test/?a=&quot;b&quot;&amp;c"');
  });
});

describe('linkExpiredResponse', () => {
  it('serves a 410 page saying when the link stopped working', async () => {
    const res = linkExpiredResponse({
      shortLink: 'short.test/launch',
      expiredAt: Date.parse('2026-10-12T18:30:00Z') / 1000,
      appUrl: APP_URL,
    });

    expect(res.status).toBe(410);
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    const html = await res.text();
    expect(html).toContain('This link has expired');
    expect(html).toContain('stopped working on 12 October 2026 at 18:30 UTC');
  });
});
