import { Hono } from 'hono';
import { insertLink } from '../db/links.js';
import { generateCode } from '../lib/codes.js';
import { readJsonObject } from '../lib/http.js';
import { normalizeDestination } from '../lib/urls.js';

// 62^7 possible codes make a clash very unlikely, and a few retries make it a non-event.
const MAX_CODE_ATTEMPTS = 5;

const links = new Hono();

links.post('/', async (c) => {
  const body = await readJsonObject(c);
  const { origin, hostname } = new URL(c.req.url);
  const longUrl = normalizeDestination(body.url, hostname);

  const link = await insertWithFreshCode(c.env.DB, longUrl);
  return c.json(toApiLink(link, origin), 201);
});

async function insertWithFreshCode(db, longUrl) {
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    const link = await insertLink(db, { code: generateCode(), longUrl });
    if (link) return link;
  }
  throw new Error(`No free short code after ${MAX_CODE_ATTEMPTS} attempts`);
}

// The database stores snake_case columns and unix seconds; the API speaks camelCase and
// ISO 8601.
function toApiLink(row, origin) {
  return {
    code: row.code,
    shortUrl: `${origin}/${row.code}`,
    longUrl: row.long_url,
    expiresAt: row.expires_at === null ? null : toIsoString(row.expires_at),
    createdAt: toIsoString(row.created_at),
  };
}

function toIsoString(unixSeconds) {
  return new Date(unixSeconds * 1000).toISOString();
}

export default links;
