import { errorResponse } from '../lib/errors.js';
import { readSessionToken } from '../lib/session.js';

// Routes that work for guests too: a valid token identifies the user, no token means a
// guest, and a bad token is an error so the app can send the person back to sign in.
export async function optionalAuth(c, next) {
  const user = await userFromHeader(c);
  if (user === null) return sessionExpired(c);
  if (user) c.set('user', user);
  await next();
}

export async function requireAuth(c, next) {
  const user = await userFromHeader(c);
  if (user === null) return sessionExpired(c);
  if (!user) return errorResponse(c, 401, 'unauthorized', 'Sign in to do that.');
  c.set('user', user);
  await next();
}

// undefined when there is no Authorization header, null when there is one that does
// not hold a valid session.
async function userFromHeader(c) {
  const header = c.req.header('Authorization');
  if (!header) return undefined;
  const token = /^Bearer (\S+)$/.exec(header)?.[1];
  if (!token) return null;
  return readSessionToken(token, c.env.JWT_SECRET).catch(() => null);
}

function sessionExpired(c) {
  return errorResponse(c, 401, 'unauthorized', 'Your session has expired. Sign in again.');
}
