import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ORIGIN, postJson, seedLink, send } from '../helpers.js';

afterEach(() => {
  vi.restoreAllMocks();
});

// Fills each random draw with one byte value, so generateCode() returns "0000000" for 0
// and "1111111" for 1. Once the list runs out, the last value repeats.
function forceCodes(...fills) {
  let draw = 0;
  vi.spyOn(crypto, 'getRandomValues').mockImplementation((bytes) =>
    bytes.fill(fills[Math.min(draw++, fills.length - 1)]),
  );
}

describe('POST /api/links', () => {
  it('creates a link with a generated code', async () => {
    const res = await postJson('/api/links', { url: 'example.com/some/long/path' });

    expect(res.status).toBe(201);
    const link = await res.json();
    expect(link).toEqual({
      code: expect.stringMatching(/^[0-9A-Za-z]{7}$/),
      shortUrl: `${ORIGIN}/${link.code}`,
      longUrl: 'https://example.com/some/long/path',
      expiresAt: null,
      createdAt: expect.any(String),
    });
    expect(Date.now() - Date.parse(link.createdAt)).toBeLessThan(60_000);

    const stored = await env.DB.prepare('SELECT long_url, user_id FROM links WHERE code = ?')
      .bind(link.code)
      .first();
    expect(stored).toEqual({ long_url: 'https://example.com/some/long/path', user_id: null });
  });

  it('draws a new code when the first one is taken', async () => {
    await seedLink('0000000', 'https://example.com/');
    forceCodes(0, 1);

    const res = await postJson('/api/links', { url: 'https://example.org/' });

    expect(res.status).toBe(201);
    expect((await res.json()).code).toBe('1111111');
  });

  it('answers 500 when it cannot find a free code', async () => {
    await seedLink('0000000', 'https://example.com/');
    forceCodes(0);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await postJson('/api/links', { url: 'https://example.org/' });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: { code: 'internal', message: 'Something went wrong on our side.' },
    });
    expect(logged).toHaveBeenCalledOnce();
  });

  it('rejects a destination that is not a web address', async () => {
    const res = await postJson('/api/links', { url: 'javascript:alert(1)' });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'invalid_url', message: "That doesn't look like a web address." },
    });
  });

  it('rejects a body without a url', async () => {
    const res = await postJson('/api/links', { link: 'https://example.com' });

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('invalid_url');
  });

  it('rejects malformed JSON', async () => {
    const res = await send('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"url": ',
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'invalid_json', message: 'The request body is not valid JSON.' },
    });
  });

  it('rejects JSON that is not an object', async () => {
    const res = await postJson('/api/links', ['https://example.com']);

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('invalid_json');
  });
});
