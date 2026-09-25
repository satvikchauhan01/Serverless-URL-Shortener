import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { send } from '../helpers.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/health', () => {
  it('answers ok when D1 responds', async () => {
    const res = await send('/api/health');

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('answers 503 when D1 is unreachable', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const brokenDb = {
      prepare() {
        throw new Error('D1 is down');
      },
    };

    const res = await send('/api/health', undefined, { ...env, DB: brokenDb });

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
    expect(logged).toHaveBeenCalledOnce();
  });
});
