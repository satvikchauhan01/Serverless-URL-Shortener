import { sign, verify } from 'hono/jwt';
import { unixSeconds } from './time.js';

const SESSION_SECONDS = 7 * 24 * 60 * 60;

// Sessions are stateless HS256 tokens. Nothing is stored server-side, so signing out
// happens in the browser and a token stays valid until it expires.
export function createSessionToken(user, secret, now = unixSeconds()) {
  return sign(
    { sub: user.id, login: user.login, iat: now, exp: now + SESSION_SECONDS },
    secret,
    'HS256',
  );
}

// Throws when the token is malformed, tampered with or expired.
export async function readSessionToken(token, secret) {
  const payload = await verify(token, secret, 'HS256');
  return { id: payload.sub, login: payload.login };
}
