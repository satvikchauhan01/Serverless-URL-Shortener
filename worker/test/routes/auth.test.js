import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readSessionToken } from '../../src/lib/session.js';
import { ORIGIN, send } from '../helpers.js';

const CALLBACK_URL = `${ORIGIN}/api/auth/github/callback`;
const APP_CALLBACK = `${env.FRONTEND_URL}/auth/callback`;

afterEach(() => {
  vi.restoreAllMocks();
});

// Stands in for GitHub's token endpoint and profile API. The Worker runs in the same
// isolate as the tests, so replacing fetch here replaces it for the Worker too.
function mockGitHub({ token = { access_token: 'gho_test' }, profile } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url === 'https://github.com/login/oauth/access_token') return Response.json(token);
    if (url === 'https://api.github.com/user') {
      return Response.json(
        profile ?? {
          id: 42,
          login: 'octocat',
          name: 'The Octocat',
          avatar_url: 'https://a.test/42',
        },
      );
    }
    throw new Error(`Unexpected request to ${url}`);
  });
}

function callback(query, state = 'expected-state') {
  return send(`/api/auth/github/callback?${new URLSearchParams(query)}`, {
    headers: { Cookie: `oauth_state=${state}` },
  });
}

function fragmentOf(response) {
  const location = new URL(response.headers.get('Location'));
  expect(`${location.origin}${location.pathname}`).toBe(APP_CALLBACK);
  return Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
}

describe('GET /api/auth/github', () => {
  it('sends the browser to GitHub with a state that is also kept in a cookie', async () => {
    const res = await send('/api/auth/github');

    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('Location'));
    expect(`${location.origin}${location.pathname}`).toBe(
      'https://github.com/login/oauth/authorize',
    );
    expect(Object.fromEntries(location.searchParams)).toMatchObject({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: CALLBACK_URL,
      scope: 'read:user',
      state: expect.stringMatching(/^[0-9a-f]{32}$/),
    });

    const cookie = res.headers.get('Set-Cookie');
    expect(cookie).toContain(`oauth_state=${location.searchParams.get('state')}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toContain('Path=/api/auth');
  });

  it('uses a fresh state every time', async () => {
    const first = new URL((await send('/api/auth/github')).headers.get('Location'));
    const second = new URL((await send('/api/auth/github')).headers.get('Location'));

    expect(first.searchParams.get('state')).not.toBe(second.searchParams.get('state'));
  });
});

describe('GET /api/auth/github/callback', () => {
  it('signs the user in and hands the app a session token', async () => {
    const github = mockGitHub();

    const res = await callback({ code: 'one-time-code', state: 'expected-state' });

    expect(res.status).toBe(302);
    const { token } = fragmentOf(res);
    expect(await readSessionToken(token, env.JWT_SECRET)).toEqual({ id: 1, login: 'octocat' });

    const user = await env.DB.prepare(
      'SELECT github_id, login, name, avatar_url FROM users',
    ).first();
    expect(user).toEqual({
      github_id: 42,
      login: 'octocat',
      name: 'The Octocat',
      avatar_url: 'https://a.test/42',
    });

    const [, tokenRequest] = github.mock.calls[0];
    expect(JSON.parse(tokenRequest.body)).toEqual({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: 'one-time-code',
      redirect_uri: CALLBACK_URL,
    });
    expect(res.headers.get('Set-Cookie')).toMatch(/oauth_state=;.*Max-Age=0/i);
  });

  it('updates the profile when someone signs in again', async () => {
    mockGitHub();
    await callback({ code: 'first', state: 'expected-state' });
    vi.restoreAllMocks();
    mockGitHub({ profile: { id: 42, login: 'octocat', name: 'Renamed', avatar_url: null } });

    await callback({ code: 'second', state: 'expected-state' });

    const { results } = await env.DB.prepare('SELECT name FROM users').all();
    expect(results).toEqual([{ name: 'Renamed' }]);
  });

  it('refuses a state that does not match the cookie, without calling GitHub', async () => {
    const github = mockGitHub();

    const res = await callback({ code: 'one-time-code', state: 'forged' });

    expect(fragmentOf(res)).toEqual({ error: 'invalid_state' });
    expect(github).not.toHaveBeenCalled();
  });

  it('refuses a callback without the state cookie', async () => {
    const github = mockGitHub();

    const res = await send('/api/auth/github/callback?code=x&state=anything');

    expect(fragmentOf(res)).toEqual({ error: 'invalid_state' });
    expect(github).not.toHaveBeenCalled();
  });

  it('tells the app when the user declines on GitHub', async () => {
    const res = await callback({ error: 'access_denied', state: 'expected-state' });

    expect(fragmentOf(res)).toEqual({ error: 'access_denied' });
  });

  it('tells the app when GitHub rejects the code', async () => {
    mockGitHub({ token: { error: 'bad_verification_code' } });
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await callback({ code: 'stale', state: 'expected-state' });

    expect(fragmentOf(res)).toEqual({ error: 'github_failed' });
    expect(logged).toHaveBeenCalledOnce();
    expect(await env.DB.prepare('SELECT count(*) AS n FROM users').first('n')).toBe(0);
  });

  it('limits sign-in attempts to 10 a minute per address', async () => {
    const statuses = [];
    for (let i = 0; i < 21; i++) {
      const res = await send('/api/auth/github', {
        headers: { 'CF-Connecting-IP': '203.0.113.5' },
      });
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 10).every((status) => status === 302)).toBe(true);
    expect(statuses).toContain(429);
  });
});
