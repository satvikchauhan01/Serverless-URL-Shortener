import { describe, expect, it } from 'vitest';
import { postJson, send } from './helpers.js';

describe('request body limit', () => {
  it('answers 413 for API bodies over 10 KB', async () => {
    const res = await postJson('/api/links', {
      url: 'https://example.com/',
      padding: 'x'.repeat(10 * 1024),
    });

    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({
      error: { code: 'payload_too_large', message: 'The request body is too large.' },
    });
  });
});

describe('unknown routes', () => {
  it('answer 404 in the API error format', async () => {
    const res = await send('/api/links/abc/unknown');

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'not_found', message: 'There is nothing here.' },
    });
  });
});
