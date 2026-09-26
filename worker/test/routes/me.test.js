import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { createSessionToken } from '../../src/lib/session.js';
import { unixSeconds } from '../../src/lib/time.js';
import { seedLink, send, signIn } from '../helpers.js';

describe('GET /api/me', () => {
  it('returns the profile with link and click totals', async () => {
    const { user, auth } = await signIn('octocat');
    await seedLink('one', 'https://example.com/1', { userId: user.id });
    await seedLink('two', 'https://example.com/2', { userId: user.id });
    await env.DB.prepare("UPDATE links SET click_count = 3 WHERE code = 'two'").run();
    await seedLink('guest01', 'https://example.com/3');

    const res = await send('/api/me', { headers: auth });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: user.id,
      login: 'octocat',
      name: null,
      avatarUrl: null,
      totals: { links: 2, clicks: 3 },
    });
  });

  it('needs a session', async () => {
    const res = await send('/api/me');

    expect(res.status).toBe(401);
    expect((await res.json()).error.message).toBe('Sign in to do that.');
  });

  it.each([
    [
      'a token signed with another secret',
      () => createSessionToken({ id: 1, login: 'x' }, 'wrong-secret'),
    ],
    [
      'an expired token',
      () =>
        createSessionToken({ id: 1, login: 'x' }, env.JWT_SECRET, unixSeconds() - 8 * 24 * 3600),
    ],
    ['a malformed header', () => null],
  ])('refuses %s', async (_, makeToken) => {
    const token = await makeToken();
    const header = token ? `Bearer ${token}` : 'Token abc';

    const res = await send('/api/me', { headers: { Authorization: header } });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: 'unauthorized', message: 'Your session has expired. Sign in again.' },
    });
  });

  it('refuses a valid token whose user no longer exists', async () => {
    const token = await createSessionToken({ id: 999, login: 'ghost' }, env.JWT_SECRET);

    const res = await send('/api/me', { headers: { Authorization: `Bearer ${token}` } });

    expect(res.status).toBe(401);
  });
});
