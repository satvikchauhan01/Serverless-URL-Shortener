import { Hono } from 'hono';
import { clickStats } from '../db/clicks.js';
import {
  deleteOwnedLink,
  findOwnedLink,
  insertLink,
  isCodeTaken,
  listLinksForUser,
  updateOwnedLink,
} from '../db/links.js';
import { aliasProblem, generateCode } from '../lib/codes.js';
import { ApiError } from '../lib/errors.js';
import { readJsonObject } from '../lib/http.js';
import { isExpired, parseExpiry, toIsoString, unixSeconds } from '../lib/time.js';
import { normalizeDestination } from '../lib/urls.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';

const DAY = 24 * 60 * 60;
const GUEST_LINK_LIFETIME = 7 * DAY;
const PAGE_SIZE = 20;
const MAX_SEARCH_LENGTH = 100;
const STATS_DAYS = 30;

// 62^7 possible codes make a clash very unlikely, and a few retries make it a non-event.
const MAX_CODE_ATTEMPTS = 5;

const guestLimit = rateLimit('GUEST_LINK_LIMITER');
const userLimit = rateLimit('USER_LINK_LIMITER', (c) => `user:${c.get('user').id}`);

const links = new Hono();

links.post(
  '/',
  optionalAuth,
  (c, next) => (c.get('user') ? userLimit(c, next) : guestLimit(c, next)),
  async (c) => {
    const body = await readJsonObject(c);
    const user = c.get('user');
    const { origin, hostname } = new URL(c.req.url);
    // An empty alias field means "pick one for me".
    const alias = body.alias ?? '';

    // Guests get a generated code and a link that lasts a week; the rest needs an account.
    if (!user && (alias !== '' || (body.expiresAt ?? null) !== null)) {
      throw new ApiError(401, 'sign_in_required', 'Sign in to pick an alias or an expiry date.');
    }
    const fields = {
      longUrl: normalizeDestination(body.url, hostname),
      expiresAt: user ? parseExpiry(body.expiresAt) : unixSeconds() + GUEST_LINK_LIFETIME,
      userId: user?.id ?? null,
    };

    const link =
      alias === ''
        ? await insertWithFreshCode(c.env.DB, fields)
        : await insertWithAlias(c.env.DB, alias, fields);
    return c.json(toApiLink(link, origin), 201);
  },
);

links.get('/availability', rateLimit('AVAILABILITY_LIMITER'), async (c) => {
  const alias = c.req.query('alias');
  if (alias === undefined) {
    throw new ApiError(400, 'invalid_alias', 'Add the alias to check, like ?alias=my-link.');
  }

  const reason = aliasProblem(alias) ?? ((await isCodeTaken(c.env.DB, alias)) ? 'taken' : null);
  return c.json({ alias, available: reason === null, reason });
});

links.get('/', requireAuth, async (c) => {
  const search = (c.req.query('q') ?? '').trim().slice(0, MAX_SEARCH_LENGTH);
  const cursor = parseCursor(c.req.query('cursor'));
  // One extra row tells us whether another page exists.
  const rows = await listLinksForUser(c.env.DB, c.get('user').id, {
    search,
    cursor,
    limit: PAGE_SIZE + 1,
  });

  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  const { origin } = new URL(c.req.url);
  return c.json({
    links: page.map((row) => toApiLink(row, origin)),
    nextCursor: rows.length > PAGE_SIZE ? `${last.created_at}.${last.rowid}` : null,
  });
});

links.get('/:code/stats', requireAuth, async (c) => {
  const link = await ownedLinkOrNotFound(c);
  const today = Math.floor(unixSeconds() / DAY);
  const firstDay = today - (STATS_DAYS - 1);
  const stats = await clickStats(c.env.DB, link.code, firstDay * DAY);

  // Days without clicks have no rows, so the series is filled in here.
  const clicksPerDay = new Map(stats.daily.map((row) => [row.day, row.clicks]));
  const daily = Array.from({ length: STATS_DAYS }, (_, i) => ({
    date: toIsoString((firstDay + i) * DAY).slice(0, 10),
    clicks: clicksPerDay.get(firstDay + i) ?? 0,
  }));

  return c.json({
    link: toApiLink(link, new URL(c.req.url).origin),
    lastClickAt: stats.lastClickAt === null ? null : toIsoString(stats.lastClickAt),
    daily,
    countries: stats.countries,
    referrers: stats.referrers,
    devices: stats.devices,
  });
});

links.patch('/:code', requireAuth, async (c) => {
  const body = await readJsonObject(c);
  if (!('url' in body) && !('expiresAt' in body)) {
    throw new ApiError(400, 'nothing_to_update', 'Send a new url, a new expiresAt, or both.');
  }
  const link = await ownedLinkOrNotFound(c);
  const { origin, hostname } = new URL(c.req.url);

  const updated = await updateOwnedLink(c.env.DB, link.code, c.get('user').id, {
    longUrl: 'url' in body ? normalizeDestination(body.url, hostname) : link.long_url,
    expiresAt: 'expiresAt' in body ? parseExpiry(body.expiresAt) : link.expires_at,
  });
  if (!updated) throw linkNotFound();
  return c.json(toApiLink(updated, origin));
});

links.delete('/:code', requireAuth, async (c) => {
  const deleted = await deleteOwnedLink(c.env.DB, c.req.param('code'), c.get('user').id);
  if (!deleted) throw linkNotFound();
  return c.body(null, 204);
});

async function insertWithFreshCode(db, fields) {
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    const link = await insertLink(db, { ...fields, code: generateCode() });
    if (link) return link;
  }
  throw new Error(`No free short code after ${MAX_CODE_ATTEMPTS} attempts`);
}

async function insertWithAlias(db, alias, fields) {
  const problem = aliasProblem(alias);
  if (problem === 'invalid') {
    throw new ApiError(
      400,
      'invalid_alias',
      'Aliases are 3 to 32 characters: letters, numbers, dashes and underscores.',
    );
  }
  if (problem === 'reserved') {
    throw new ApiError(400, 'alias_reserved', 'That alias is reserved. Try another one.');
  }

  const link = await insertLink(db, { ...fields, code: alias });
  if (!link) {
    throw new ApiError(409, 'alias_taken', 'That alias is already taken.');
  }
  return link;
}

async function ownedLinkOrNotFound(c) {
  const link = await findOwnedLink(c.env.DB, c.req.param('code'), c.get('user').id);
  if (!link) throw linkNotFound();
  return link;
}

function linkNotFound() {
  return new ApiError(404, 'not_found', 'There is no link with that code in your account.');
}

function parseCursor(value) {
  if (value === undefined) return null;
  const match = /^(\d+)\.(\d+)$/.exec(value);
  if (!match) {
    throw new ApiError(400, 'invalid_cursor', 'That page cursor is not valid.');
  }
  return { createdAt: Number(match[1]), rowid: Number(match[2]) };
}

// The database stores snake_case columns and unix seconds; the API speaks camelCase and
// ISO 8601.
function toApiLink(row, origin) {
  return {
    code: row.code,
    shortUrl: `${origin}/${row.code}`,
    longUrl: row.long_url,
    expiresAt: row.expires_at === null ? null : toIsoString(row.expires_at),
    expired: isExpired(row.expires_at),
    clickCount: row.click_count,
    createdAt: toIsoString(row.created_at),
  };
}

export default links;
