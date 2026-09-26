import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../src/index.js';
import { unixSeconds } from '../../src/lib/time.js';
import { BROWSER_UA, clickCountOf, clicksFor, ORIGIN, seedLink, send } from '../helpers.js';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const fromBrowser = { headers: { 'User-Agent': BROWSER_UA } };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /:code', () => {
  it('redirects to the destination with a 302', async () => {
    await seedLink('abc1234', 'https://example.com/landing?ref=short');

    const res = await send('/abc1234');

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('https://example.com/landing?ref=short');
  });

  it('shows the not-found page for an unknown code', async () => {
    const res = await send('/nope123');

    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(await res.text()).toContain('<code>short.test/nope123</code>');
  });

  it('treats codes as case-sensitive', async () => {
    await seedLink('CaseKey', 'https://example.com/');

    expect((await send('/CaseKey')).status).toBe(302);
    expect((await send('/casekey')).status).toBe(404);
  });

  it('turns away paths that cannot be codes without querying D1', async () => {
    const unreachableDb = {
      prepare() {
        throw new Error('D1 should not be queried');
      },
    };

    const res = await send('/wp-login.php', undefined, { ...env, DB: unreachableDb });

    expect(res.status).toBe(404);
  });

  it('shows the expired page once a link has expired', async () => {
    await seedLink('old-sale', 'https://example.com/sale', { expiresAt: unixSeconds() - 60 });

    const res = await send('/old-sale');

    expect(res.status).toBe(410);
    expect(await res.text()).toContain('This link has expired');
  });

  it('keeps redirecting until the expiry', async () => {
    await seedLink('new-sale', 'https://example.com/sale', { expiresAt: unixSeconds() + 3600 });

    expect((await send('/new-sale')).status).toBe(302);
  });
});

describe('GET /', () => {
  it('sends visitors to the frontend', async () => {
    const res = await send('/');

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe(env.FRONTEND_URL);
  });
});

describe('click recording', () => {
  it('stores the country, referrer host and device of a visit', async () => {
    await seedLink('abc1234', 'https://example.com/');

    await send('/abc1234', {
      headers: { 'User-Agent': IPHONE_UA, Referer: 'https://www.reddit.com/r/webdev/' },
      cf: { country: 'DE' },
    });

    expect(await clicksFor('abc1234')).toEqual([
      { country: 'DE', referrer: 'reddit.com', device: 'mobile' },
    ]);
    expect(await clickCountOf('abc1234')).toBe(1);
  });

  it('counts every visit', async () => {
    await seedLink('abc1234', 'https://example.com/');

    for (let i = 0; i < 3; i++) await send('/abc1234', fromBrowser);

    expect(await clickCountOf('abc1234')).toBe(3);
    expect(await clicksFor('abc1234')).toHaveLength(3);
  });

  it('redirects bots and HEAD requests without counting them', async () => {
    await seedLink('abc1234', 'https://example.com/');

    const bot = await send('/abc1234', { headers: { 'User-Agent': 'Slackbot-LinkExpanding 1.0' } });
    const head = await send('/abc1234', { method: 'HEAD', ...fromBrowser });

    expect([bot.status, head.status]).toEqual([302, 302]);
    expect(await clickCountOf('abc1234')).toBe(0);
  });

  it('does not count visits to an expired link', async () => {
    await seedLink('old-sale', 'https://example.com/', { expiresAt: unixSeconds() - 60 });

    await send('/old-sale', fromBrowser);

    expect(await clicksFor('old-sale')).toEqual([]);
  });

  it('answers after one indexed lookup, before the click is written', async () => {
    await seedLink('abc1234', 'https://example.com/');
    let releaseClickWrite;
    const clickWriteReleased = new Promise((resolve) => (releaseClickWrite = resolve));
    const prepared = [];
    let batched = 0;
    // Records every statement and holds the click batch back until the test lets it go.
    const heldDb = {
      prepare(sql) {
        prepared.push(sql);
        return env.DB.prepare(sql);
      },
      async batch(statements) {
        batched += statements.length;
        await clickWriteReleased;
        return env.DB.batch(statements);
      },
    };
    const ctx = createExecutionContext();

    const res = await worker.fetch(
      new Request(`${ORIGIN}/abc1234`, fromBrowser),
      { ...env, DB: heldDb },
      ctx,
    );

    expect(res.status).toBe(302);
    expect(await clickCountOf('abc1234')).toBe(0);
    expect(prepared.length - batched).toBe(1);
    const plan = await env.DB.prepare(`EXPLAIN QUERY PLAN ${prepared[0]}`).bind('abc1234').all();
    expect(plan.results[0].detail).toMatch(/^SEARCH links USING (COVERING )?INDEX/);

    releaseClickWrite();
    await waitOnExecutionContext(ctx);
    expect(await clickCountOf('abc1234')).toBe(1);
  });

  it('still redirects when the click cannot be written', async () => {
    await seedLink('abc1234', 'https://example.com/');
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const dbOverItsLimit = {
      prepare: (sql) => env.DB.prepare(sql),
      batch: async () => {
        throw new Error('D1 daily write limit reached');
      },
    };

    const res = await send('/abc1234', fromBrowser, { ...env, DB: dbOverItsLimit });

    expect(res.status).toBe(302);
    expect(logged).toHaveBeenCalledWith('Could not record a click for abc1234:', expect.any(Error));
  });
});
