import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ORIGIN, postJson, seedLink, send, signIn } from '../helpers.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

describe('POST /api/links as a guest', () => {
  it('creates a link with a generated code that lasts a week', async () => {
    const res = await postJson('/api/links', { url: 'example.com/some/long/path' });

    expect(res.status).toBe(201);
    const link = await res.json();
    expect(link).toEqual({
      code: expect.stringMatching(/^[0-9A-Za-z]{7}$/),
      shortUrl: `${ORIGIN}/${link.code}`,
      longUrl: 'https://example.com/some/long/path',
      expiresAt: expect.any(String),
      expired: false,
      clickCount: 0,
      createdAt: expect.any(String),
    });
    expect(Date.parse(link.expiresAt) - Date.parse(link.createdAt)).toBe(WEEK_MS);

    const stored = await env.DB.prepare('SELECT long_url, user_id FROM links WHERE code = ?')
      .bind(link.code)
      .first();
    expect(stored).toEqual({ long_url: 'https://example.com/some/long/path', user_id: null });
  });

  it('needs an account to pick an alias', async () => {
    const res = await postJson('/api/links', { url: 'https://example.com/', alias: 'mine' });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: 'sign_in_required', message: 'Sign in to pick an alias or an expiry date.' },
    });
  });

  it('needs an account to pick an expiry', async () => {
    const res = await postJson('/api/links', {
      url: 'https://example.com/',
      expiresAt: '2030-01-01T00:00:00Z',
    });

    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('sign_in_required');
  });

  it('accepts an empty alias and a null expiry, which mean "not set"', async () => {
    const res = await postJson('/api/links', {
      url: 'https://example.com/',
      alias: '',
      expiresAt: null,
    });

    expect(res.status).toBe(201);
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

describe('POST /api/links when signed in', () => {
  it('stores the link in the account, without an expiry unless asked', async () => {
    const { user, auth } = await signIn();

    const res = await postJson('/api/links', { url: 'https://example.com/' }, auth);

    expect(res.status).toBe(201);
    const link = await res.json();
    expect(link.expiresAt).toBeNull();
    const owner = await env.DB.prepare('SELECT user_id FROM links WHERE code = ?')
      .bind(link.code)
      .first('user_id');
    expect(owner).toBe(user.id);
  });

  it('uses a custom alias as the code', async () => {
    const { auth } = await signIn();

    const res = await postJson(
      '/api/links',
      { url: 'https://example.com/cv', alias: 'my-resume' },
      auth,
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ code: 'my-resume', shortUrl: `${ORIGIN}/my-resume` });
  });

  it.each(['ab', 'has space', 'a'.repeat(33), 42])('rejects %j as an alias', async (alias) => {
    const { auth } = await signIn();

    const res = await postJson('/api/links', { url: 'https://example.com/', alias }, auth);

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('invalid_alias');
  });

  it('rejects reserved words in any letter case', async () => {
    const { auth } = await signIn();

    const res = await postJson(
      '/api/links',
      { url: 'https://example.com/', alias: 'Dashboard' },
      auth,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: 'alias_reserved', message: 'That alias is reserved. Try another one.' },
    });
  });

  it('answers 409 when the alias is taken', async () => {
    const { auth } = await signIn();
    await seedLink('launch', 'https://example.com/');

    const res = await postJson(
      '/api/links',
      { url: 'https://example.org/', alias: 'launch' },
      auth,
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: 'alias_taken', message: 'That alias is already taken.' },
    });
  });

  it('stores a chosen expiry and returns it', async () => {
    const { auth } = await signIn();
    const expiresAt = new Date(Date.now() + WEEK_MS * 4);
    expiresAt.setUTCMilliseconds(0);

    const res = await postJson(
      '/api/links',
      { url: 'https://example.com/', expiresAt: expiresAt.toISOString() },
      auth,
    );

    expect(res.status).toBe(201);
    expect((await res.json()).expiresAt).toBe(expiresAt.toISOString());
  });

  it('rejects an expiry in the past', async () => {
    const { auth } = await signIn();

    const res = await postJson(
      '/api/links',
      { url: 'https://example.com/', expiresAt: '2020-01-01T00:00:00Z' },
      auth,
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('invalid_expiry');
  });

  it('refuses an expired session instead of quietly treating it as a guest', async () => {
    const res = await postJson(
      '/api/links',
      { url: 'https://example.com/' },
      { Authorization: 'Bearer not-a-real-token' },
    );

    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('unauthorized');
  });
});

describe('GET /api/links/availability', () => {
  async function check(alias) {
    const res = await send(`/api/links/availability?alias=${encodeURIComponent(alias)}`);
    expect(res.status).toBe(200);
    return res.json();
  }

  it('reports a free alias as available', async () => {
    expect(await check('free-name')).toEqual({ alias: 'free-name', available: true, reason: null });
  });

  it('reports an alias that is already used', async () => {
    await seedLink('launch', 'https://example.com/');

    expect(await check('launch')).toEqual({ alias: 'launch', available: false, reason: 'taken' });
  });

  it('reports reserved and malformed aliases', async () => {
    expect(await check('API')).toMatchObject({ available: false, reason: 'reserved' });
    expect(await check('no spaces')).toMatchObject({ available: false, reason: 'invalid' });
  });

  it('needs the alias to check', async () => {
    const res = await send('/api/links/availability');

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('invalid_alias');
  });
});

// The emulated limiter counts in fixed windows that line up with the clock's minutes, so
// a burst can straddle two windows. Sending twice the limit plus one still guarantees a
// refusal, and the first `limit` requests always get through.
describe('rate limits', () => {
  it('lets a guest create 5 links a minute, then answers 429', async () => {
    const guest = { 'CF-Connecting-IP': '203.0.113.7' };
    const responses = [];
    for (let i = 0; i < 11; i++) {
      responses.push(await postJson('/api/links', { url: `https://example.com/${i}` }, guest));
    }

    expect(responses.slice(0, 5).map((res) => res.status)).toEqual([201, 201, 201, 201, 201]);
    const refused = responses.find((res) => res.status === 429);
    expect(refused).toBeDefined();
    expect(refused.headers.get('Retry-After')).toBe('60');
    expect(await refused.json()).toEqual({
      error: { code: 'rate_limited', message: 'Too many requests. Try again in a minute.' },
    });

    const anotherGuest = { 'CF-Connecting-IP': '203.0.113.8' };
    const res = await postJson('/api/links', { url: 'https://example.com/' }, anotherGuest);
    expect(res.status).toBe(201);
  });

  it('gives each signed-in user 30 links a minute, wherever they connect from', async () => {
    const { auth } = await signIn();
    const statuses = [];
    for (let i = 0; i < 61; i++) {
      const ip = { 'CF-Connecting-IP': `198.51.100.${i}` };
      const res = await postJson(
        '/api/links',
        { url: `https://example.com/${i}` },
        { ...auth, ...ip },
      );
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 30).every((status) => status === 201)).toBe(true);
    expect(statuses).toContain(429);
  });

  it('allows 60 availability checks a minute per address', async () => {
    const statuses = [];
    for (let i = 0; i < 121; i++) {
      const res = await send('/api/links/availability?alias=free-name', {
        headers: { 'CF-Connecting-IP': '203.0.113.9' },
      });
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 60).every((status) => status === 200)).toBe(true);
    expect(statuses).toContain(429);
  });
});
