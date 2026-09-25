import { Hono } from 'hono';
import { findLinkByCode } from '../db/links.js';
import { CODE_PATTERN } from '../lib/codes.js';

const redirects = new Hono();

// The short-link host has no page of its own, so visitors are sent to the app.
redirects.get('/', (c) => c.redirect(c.env.FRONTEND_URL));

redirects.get('/:code', async (c) => {
  const code = c.req.param('code');
  // Scanners probe paths like /wp-login.php all day. Those can never be codes, so they
  // are turned away without a database read.
  const link = CODE_PATTERN.test(code) ? await findLinkByCode(c.env.DB, code) : null;
  if (!link) {
    return c.text('This short link does not exist.', 404);
  }
  // Always 302. Browsers cache a 301, so repeat visits would skip the Worker, never be
  // counted, and keep working after the link expires or is deleted.
  return c.redirect(link.long_url, 302);
});

export default redirects;
