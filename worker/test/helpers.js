import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import worker from '../src/index.js';

export const ORIGIN = 'https://short.test';

// Sends a request through the Worker the way the runtime would, then waits for any
// ctx.waitUntil() work so tests can check its side effects.
export async function send(path, init, bindings = env) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(ORIGIN + path, init), bindings, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

export function postJson(path, body) {
  return send(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function seedLink(code, longUrl) {
  return env.DB.prepare('INSERT INTO links (code, long_url) VALUES (?, ?)')
    .bind(code, longUrl)
    .run();
}
