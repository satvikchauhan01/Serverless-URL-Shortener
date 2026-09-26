import {
  createExecutionContext,
  createScheduledController,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import worker from '../src/index.js';
import { BROWSER_UA, send, signIn } from './helpers.js';

// Drives every endpoint and the cleanup job through a D1 wrapper that records each SQL
// statement, then asks SQLite how it would run them. On D1 every row a query reads is
// billed, so a full scan of links or clicks is treated as a bug.
describe('query plans', () => {
  it('never scan the links or clicks tables', async () => {
    const statements = new Set();
    const recordingDb = {
      prepare(sql) {
        statements.add(sql);
        return env.DB.prepare(sql);
      },
      batch: (batch) => env.DB.batch(batch),
    };
    const bindings = { ...env, DB: recordingDb };
    const { auth } = await signIn();
    const json = (body) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify(body),
    });

    await send('/api/links', json({ url: 'https://example.com/', alias: 'launch' }), bindings);
    await send('/api/links', json({ url: 'https://example.com/random' }), bindings);
    await send('/api/links/availability?alias=launch', undefined, bindings);
    await send('/launch', { headers: { 'User-Agent': BROWSER_UA } }, bindings);
    const page = await (await send('/api/links?q=ex', { headers: auth }, bindings)).json();
    await send(`/api/links?cursor=${Date.now()}.1`, { headers: auth }, bindings);
    await send('/api/links/launch/stats', { headers: auth }, bindings);
    await send('/api/links/launch', { ...json({ expiresAt: null }), method: 'PATCH' }, bindings);
    await send('/api/me', { headers: auth }, bindings);
    await send(`/api/links/${page.links[0].code}`, { method: 'DELETE', headers: auth }, bindings);
    const ctx = createExecutionContext();
    await worker.scheduled(createScheduledController({ scheduledTime: Date.now() }), bindings, ctx);
    await waitOnExecutionContext(ctx);

    expect(statements.size).toBeGreaterThan(10);
    for (const sql of statements) {
      const placeholders = sql.match(/\?/g)?.length ?? 0;
      const { results } = await env.DB.prepare(`EXPLAIN QUERY PLAN ${sql}`)
        .bind(...Array(placeholders).fill(null))
        .all();
      for (const { detail } of results) {
        expect(detail, sql).not.toMatch(/^SCAN (links|clicks)\b/);
      }
    }
  });
});
