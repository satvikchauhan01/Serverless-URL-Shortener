import { Hono } from 'hono';
import { recordClick } from '../db/clicks.js';
import { findLinkByCode } from '../db/links.js';
import { CODE_PATTERN } from '../lib/codes.js';
import { isExpired, unixSeconds } from '../lib/time.js';
import { describeVisit } from '../lib/visits.js';
import { linkExpiredResponse, linkNotFoundResponse } from '../pages/link-pages.js';

const redirects = new Hono();

// The short-link host has no page of its own, so visitors are sent to the app.
redirects.get('/', (c) => c.redirect(c.env.FRONTEND_URL));

redirects.get('/:code', async (c) => {
  const code = c.req.param('code');
  const appUrl = c.env.FRONTEND_URL;

  // Scanners probe paths like /wp-login.php all day. Those can never be codes, so they
  // are turned away without a database read.
  if (!CODE_PATTERN.test(code)) {
    return linkNotFoundResponse({ appUrl });
  }

  const shortLink = `${new URL(c.req.url).host}/${code}`;
  const link = await findLinkByCode(c.env.DB, code);
  if (!link) {
    return linkNotFoundResponse({ shortLink, appUrl });
  }

  const now = unixSeconds();
  if (isExpired(link.expires_at, now)) {
    return linkExpiredResponse({ shortLink, expiredAt: link.expires_at, appUrl });
  }

  // HEAD requests come from link checkers: they get the redirect but are not counted.
  const visit = c.req.method === 'GET' ? describeVisit(c.req.raw) : null;
  if (visit) {
    // Written after the response has gone out, so the visitor never waits on analytics.
    c.executionCtx.waitUntil(
      recordClick(c.env.DB, { code, clickedAt: now, ...visit }).catch((err) =>
        console.error(`Could not record a click for ${code}:`, err),
      ),
    );
  }

  // Always 302. Browsers cache a 301, so repeat visits would skip the Worker, never be
  // counted, and keep working after the link expires or is deleted.
  return c.redirect(link.long_url, 302);
});

export default redirects;
