import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { seedLink, send } from '../helpers.js';

describe('GET /:code', () => {
  it('redirects to the destination with a 302', async () => {
    await seedLink('abc1234', 'https://example.com/landing?ref=short');

    const res = await send('/abc1234');

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('https://example.com/landing?ref=short');
  });

  it('answers 404 for a code that does not exist', async () => {
    const res = await send('/nope123');

    expect(res.status).toBe(404);
    expect(await res.text()).toBe('This short link does not exist.');
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
});

describe('GET /', () => {
  it('sends visitors to the frontend', async () => {
    const res = await send('/');

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe(env.FRONTEND_URL);
  });
});
