import { Hono } from 'hono';
import { findUserWithTotals } from '../db/users.js';
import { errorResponse } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';

const me = new Hono();

me.get('/', requireAuth, async (c) => {
  const user = await findUserWithTotals(c.env.DB, c.get('user').id);
  // A valid token for a user who no longer exists is treated like an expired session.
  if (!user) {
    return errorResponse(c, 401, 'unauthorized', 'Your session has expired. Sign in again.');
  }

  return c.json({
    id: user.id,
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
    totals: { links: user.link_count, clicks: user.click_count },
  });
});

export default me;
