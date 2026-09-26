import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { upsertGithubUser } from '../db/users.js';
import { authorizeUrl, exchangeCode, fetchProfile } from '../lib/github.js';
import { createSessionToken } from '../lib/session.js';
import { rateLimit } from '../middleware/rate-limit.js';

const STATE_COOKIE = 'oauth_state';
const STATE_COOKIE_OPTIONS = { path: '/api/auth', httpOnly: true, secure: true, sameSite: 'Lax' };

const auth = new Hono();

auth.use('*', rateLimit('AUTH_LIMITER'));

// Step 1: send the browser to GitHub. The random state goes into a short-lived cookie and
// must come back unchanged, which stops anyone from forging the callback.
auth.get('/github', (c) => {
  const state = randomHex(16);
  setCookie(c, STATE_COOKIE, state, { ...STATE_COOKIE_OPTIONS, maxAge: 600 });
  return c.redirect(
    authorizeUrl({ clientId: c.env.GITHUB_CLIENT_ID, redirectUri: callbackUrl(c), state }),
  );
});

// Step 2: GitHub sends the browser back here with a one-time code. The session token is
// handed to the app in the URL fragment, which browsers never send to any server.
auth.get('/github/callback', async (c) => {
  const { code, state, error } = c.req.query();
  const expectedState = getCookie(c, STATE_COOKIE);
  deleteCookie(c, STATE_COOKIE, STATE_COOKIE_OPTIONS);

  if (error) return backToApp(c, { error: 'access_denied' });
  if (!code || !state || state !== expectedState) return backToApp(c, { error: 'invalid_state' });

  try {
    const accessToken = await exchangeCode({
      clientId: c.env.GITHUB_CLIENT_ID,
      clientSecret: c.env.GITHUB_CLIENT_SECRET,
      code,
      redirectUri: callbackUrl(c),
    });
    const user = await upsertGithubUser(c.env.DB, await fetchProfile(accessToken));
    return backToApp(c, { token: await createSessionToken(user, c.env.JWT_SECRET) });
  } catch (err) {
    console.error('GitHub sign-in failed:', err);
    return backToApp(c, { error: 'github_failed' });
  }
});

function callbackUrl(c) {
  return `${new URL(c.req.url).origin}/api/auth/github/callback`;
}

function backToApp(c, params) {
  const url = new URL('/auth/callback', c.env.FRONTEND_URL);
  url.hash = new URLSearchParams(params).toString();
  return c.redirect(url.href);
}

function randomHex(bytes) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export default auth;
