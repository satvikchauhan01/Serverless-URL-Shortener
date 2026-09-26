import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../src/index.js';
import { createSessionToken } from '../src/lib/session.js';

export const ORIGIN = 'https://short.test';

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

// Sends a request through the Worker the way the runtime would, then waits for any
// ctx.waitUntil() work so tests can check its side effects.
export async function send(path, init, bindings = env) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(ORIGIN + path, init), bindings, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

export function sendJson(method, path, body, headers = {}) {
  return send(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

export function postJson(path, body, headers = {}) {
  return sendJson('POST', path, body, headers);
}

let nextGithubId = 1;

// Creates a user and returns the Authorization header a signed-in browser would send.
export async function signIn(login = 'octocat') {
  const user = await env.DB.prepare(
    'INSERT INTO users (github_id, login) VALUES (?, ?) RETURNING id, login',
  )
    .bind(nextGithubId++, login)
    .first();
  const token = await createSessionToken(user, env.JWT_SECRET);
  return { user, auth: { Authorization: `Bearer ${token}` } };
}

export function seedLink(code, longUrl, { expiresAt = null, userId = null, createdAt } = {}) {
  return env.DB.prepare(
    `INSERT INTO links (code, long_url, expires_at, user_id, created_at)
     VALUES (?, ?, ?, ?, COALESCE(?, unixepoch()))`,
  )
    .bind(code, longUrl, expiresAt, userId, createdAt ?? null)
    .run();
}

export async function clicksFor(code) {
  const { results } = await env.DB.prepare(
    'SELECT country, referrer, device FROM clicks WHERE code = ? ORDER BY id',
  )
    .bind(code)
    .all();
  return results;
}

export function clickCountOf(code) {
  return env.DB.prepare('SELECT click_count FROM links WHERE code = ?')
    .bind(code)
    .first('click_count');
}
