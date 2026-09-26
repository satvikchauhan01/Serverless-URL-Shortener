import {
  createExecutionContext,
  createScheduledController,
  env,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../src/index.js';
import { unixSeconds } from '../../src/lib/time.js';
import { seedLink } from '../helpers.js';

const DAY = 24 * 60 * 60;

afterEach(() => {
  vi.restoreAllMocks();
});

async function runDailyCleanup(scheduledTime) {
  const ctx = createExecutionContext();
  const controller = createScheduledController({ scheduledTime, cron: '17 3 * * *' });
  await worker.scheduled(controller, env, ctx);
  await waitOnExecutionContext(ctx);
}

describe('daily cleanup', () => {
  it('deletes links that expired more than 30 days ago, clicks included', async () => {
    const now = Date.now();
    const today = unixSeconds(now);
    await seedLink('long-gone', 'https://example.com/1', { expiresAt: today - 31 * DAY });
    await seedLink('recent', 'https://example.com/2', { expiresAt: today - 10 * DAY });
    await seedLink('forever', 'https://example.com/3');
    await seedLink('upcoming', 'https://example.com/4', { expiresAt: today + DAY });
    await env.DB.prepare("INSERT INTO clicks (code, clicked_at) VALUES ('long-gone', ?)")
      .bind(today - 40 * DAY)
      .run();
    const logged = vi.spyOn(console, 'log').mockImplementation(() => {});

    await runDailyCleanup(now);

    const { results } = await env.DB.prepare('SELECT code FROM links ORDER BY code').all();
    expect(results.map((row) => row.code)).toEqual(['forever', 'recent', 'upcoming']);
    expect(await env.DB.prepare('SELECT count(*) AS n FROM clicks').first('n')).toBe(0);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('removed 1 link(s)'));
  });
});
