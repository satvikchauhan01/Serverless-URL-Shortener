import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { postJson, send } from './helpers.js';

describe('CORS', () => {
  it('lets the frontend call the API with a token', async () => {
    const res = await send('/api/links', {
      method: 'OPTIONS',
      headers: {
        Origin: env.FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, content-type',
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(env.FRONTEND_URL);
    expect(res.headers.get('Access-Control-Allow-Headers')).toMatch(/Authorization/i);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('PATCH');
  });

  it('does not let other sites read API responses', async () => {
    const res = await send('/api/health', { headers: { Origin: 'https://evil.example' } });

    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});

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
