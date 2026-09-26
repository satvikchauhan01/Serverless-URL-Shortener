import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { unixSeconds } from '../../src/lib/time.js';
import { ORIGIN, seedLink, send, sendJson, signIn } from '../helpers.js';

const DAY = 24 * 60 * 60;

function addClick(code, clickedAt, { country = null, referrer = null, device = 'desktop' } = {}) {
  return env.DB.batch([
    env.DB.prepare(
      'INSERT INTO clicks (code, clicked_at, country, referrer, device) VALUES (?, ?, ?, ?, ?)',
    ).bind(code, clickedAt, country, referrer, device),
    env.DB.prepare('UPDATE links SET click_count = click_count + 1 WHERE code = ?').bind(code),
  ]);
}

describe('GET /api/links', () => {
  it('lists only the caller’s links, newest first', async () => {
    const { user, auth } = await signIn('owner');
    const { user: someoneElse } = await signIn('someone-else');
    await seedLink('older', 'https://example.com/1', { userId: user.id, createdAt: 1000 });
    await seedLink('newer', 'https://example.com/2', { userId: user.id, createdAt: 2000 });
    await seedLink('theirs', 'https://example.com/3', { userId: someoneElse.id });
    await seedLink('guest01', 'https://example.com/4');

    const res = await send('/api/links', { headers: auth });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.links.map((link) => link.code)).toEqual(['newer', 'older']);
    expect(body.links[0]).toEqual({
      code: 'newer',
      shortUrl: `${ORIGIN}/newer`,
      longUrl: 'https://example.com/2',
      expiresAt: null,
      expired: false,
      clickCount: 0,
      createdAt: '1970-01-01T00:33:20.000Z',
    });
    expect(body.nextCursor).toBeNull();
  });

  it('pages through 20 links at a time', async () => {
    const { user, auth } = await signIn();
    // 25 links, the last few created in the same second to exercise the tie-breaker.
    for (let i = 0; i < 25; i++) {
      await seedLink(`link-${String(i).padStart(2, '0')}`, 'https://example.com/', {
        userId: user.id,
        createdAt: 1000 + Math.min(i, 20),
      });
    }

    const first = await (await send('/api/links', { headers: auth })).json();
    const second = await (
      await send(`/api/links?cursor=${first.nextCursor}`, { headers: auth })
    ).json();

    expect(first.links).toHaveLength(20);
    expect(second.links).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
    const seen = [...first.links, ...second.links].map((link) => link.code);
    expect(new Set(seen).size).toBe(25);
  });

  it('searches codes and destinations', async () => {
    const { user, auth } = await signIn();
    await seedLink('resume', 'https://example.com/cv.pdf', { userId: user.id });
    await seedLink('talk', 'https://slides.example/100%-real', { userId: user.id });
    await seedLink('other', 'https://example.org/', { userId: user.id });

    const search = async (q) => {
      const res = await send(`/api/links?q=${encodeURIComponent(q)}`, { headers: auth });
      return (await res.json()).links.map((link) => link.code);
    };

    expect(await search('resu')).toEqual(['resume']);
    expect(await search('slides')).toEqual(['talk']);
    // % and _ are searched for literally, not used as wildcards.
    expect(await search('100%')).toEqual(['talk']);
    expect(await search('%')).toEqual(['talk']);
  });

  it('marks expired links', async () => {
    const { user, auth } = await signIn();
    await seedLink('old-sale', 'https://example.com/', {
      userId: user.id,
      expiresAt: unixSeconds() - 60,
    });

    const body = await (await send('/api/links', { headers: auth })).json();

    expect(body.links[0]).toMatchObject({ code: 'old-sale', expired: true });
  });

  it('needs a session', async () => {
    const res = await send('/api/links');

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      error: { code: 'unauthorized', message: 'Sign in to do that.' },
    });
  });

  it('rejects a cursor it did not produce', async () => {
    const { auth } = await signIn();

    const res = await send('/api/links?cursor=drop-table', { headers: auth });

    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('invalid_cursor');
  });
});

describe('GET /api/links/:code/stats', () => {
  it('summarises the clicks of the last 30 days', async () => {
    const { user, auth } = await signIn();
    await seedLink('launch', 'https://example.com/', { userId: user.id });
    const now = unixSeconds();
    await addClick('launch', now - 60, { country: 'IN', referrer: 'reddit.com', device: 'mobile' });
    await addClick('launch', now - 120, { country: 'IN', device: 'mobile' });
    await addClick('launch', now - 2 * DAY, { country: 'DE', referrer: 'reddit.com' });
    // Outside the chart window, but still part of the totals.
    await addClick('launch', now - 45 * DAY, { country: 'US' });

    const res = await send('/api/links/launch/stats', { headers: auth });

    expect(res.status).toBe(200);
    const stats = await res.json();
    expect(stats.link).toMatchObject({ code: 'launch', clickCount: 4 });
    expect(Date.parse(stats.lastClickAt)).toBe((now - 60) * 1000);
    expect(stats.daily).toHaveLength(30);
    expect(stats.daily.at(-1)).toEqual({
      date: new Date(now * 1000).toISOString().slice(0, 10),
      clicks: 2,
    });
    expect(stats.daily.at(-3).clicks).toBe(1);
    expect(stats.daily.reduce((sum, day) => sum + day.clicks, 0)).toBe(3);
    expect(stats.countries).toEqual([
      { country: 'IN', clicks: 2 },
      { country: 'DE', clicks: 1 },
      { country: 'US', clicks: 1 },
    ]);
    expect(stats.referrers).toEqual([
      { referrer: null, clicks: 2 },
      { referrer: 'reddit.com', clicks: 2 },
    ]);
    expect(stats.devices).toEqual([
      { device: 'desktop', clicks: 2 },
      { device: 'mobile', clicks: 2 },
    ]);
  });

  it('works for a link nobody has clicked yet', async () => {
    const { user, auth } = await signIn();
    await seedLink('quiet', 'https://example.com/', { userId: user.id });

    const stats = await (await send('/api/links/quiet/stats', { headers: auth })).json();

    expect(stats.lastClickAt).toBeNull();
    expect(stats.daily.every((day) => day.clicks === 0)).toBe(true);
    expect(stats.countries).toEqual([]);
  });

  it('treats someone else’s link as missing', async () => {
    const { user: owner } = await signIn('owner');
    const { auth: intruder } = await signIn('intruder');
    await seedLink('private', 'https://example.com/', { userId: owner.id });

    const res = await send('/api/links/private/stats', { headers: intruder });

    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('not_found');
  });
});

describe('PATCH /api/links/:code', () => {
  it('changes the destination and the expiry', async () => {
    const { user, auth } = await signIn();
    await seedLink('launch', 'https://example.com/old', { userId: user.id });
    const expiresAt = new Date(Date.now() + 10 * DAY * 1000);
    expiresAt.setUTCMilliseconds(0);

    const res = await sendJson(
      'PATCH',
      '/api/links/launch',
      { url: 'example.com/new', expiresAt: expiresAt.toISOString() },
      auth,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      code: 'launch',
      longUrl: 'https://example.com/new',
      expiresAt: expiresAt.toISOString(),
    });
    expect((await send('/launch')).headers.get('Location')).toBe('https://example.com/new');
  });

  it('removes the expiry when it is set to null, leaving the destination alone', async () => {
    const { user, auth } = await signIn();
    await seedLink('launch', 'https://example.com/', {
      userId: user.id,
      expiresAt: unixSeconds() + DAY,
    });

    const res = await sendJson('PATCH', '/api/links/launch', { expiresAt: null }, auth);

    expect(await res.json()).toMatchObject({ longUrl: 'https://example.com/', expiresAt: null });
  });

  it('validates the new values like a new link', async () => {
    const { user, auth } = await signIn();
    await seedLink('launch', 'https://example.com/', { userId: user.id });

    const badUrl = await sendJson('PATCH', '/api/links/launch', { url: 'ftp://x.example' }, auth);
    const pastExpiry = await sendJson(
      'PATCH',
      '/api/links/launch',
      { expiresAt: '2020-01-01' },
      auth,
    );
    const empty = await sendJson('PATCH', '/api/links/launch', {}, auth);

    expect((await badUrl.json()).error.code).toBe('invalid_url');
    expect((await pastExpiry.json()).error.code).toBe('invalid_expiry');
    expect((await empty.json()).error.code).toBe('nothing_to_update');
  });

  it('treats someone else’s link as missing', async () => {
    const { user: owner } = await signIn('owner');
    const { auth: intruder } = await signIn('intruder');
    await seedLink('private', 'https://example.com/', { userId: owner.id });

    const res = await sendJson(
      'PATCH',
      '/api/links/private',
      { url: 'https://evil.example/' },
      intruder,
    );

    expect(res.status).toBe(404);
    expect((await send('/private')).headers.get('Location')).toBe('https://example.com/');
  });
});

describe('DELETE /api/links/:code', () => {
  it('deletes the link and its clicks', async () => {
    const { user, auth } = await signIn();
    await seedLink('launch', 'https://example.com/', { userId: user.id });
    await addClick('launch', unixSeconds());

    const res = await send('/api/links/launch', { method: 'DELETE', headers: auth });

    expect(res.status).toBe(204);
    expect((await send('/launch')).status).toBe(404);
    expect(await env.DB.prepare('SELECT count(*) AS n FROM clicks').first('n')).toBe(0);
  });

  it('treats someone else’s link as missing', async () => {
    const { user: owner } = await signIn('owner');
    const { auth: intruder } = await signIn('intruder');
    await seedLink('private', 'https://example.com/', { userId: owner.id });

    const res = await send('/api/links/private', { method: 'DELETE', headers: intruder });

    expect(res.status).toBe(404);
    expect((await send('/private')).status).toBe(302);
  });
});

describe('without a session', () => {
  it.each([
    ['GET', '/api/links/launch/stats'],
    ['PATCH', '/api/links/launch'],
    ['DELETE', '/api/links/launch'],
  ])('%s %s answers 401', async (method, path) => {
    const res = await send(path, { method });

    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe('unauthorized');
  });
});
