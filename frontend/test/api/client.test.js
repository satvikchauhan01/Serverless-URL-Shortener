import { describe, expect, it, vi } from 'vitest';
import { ApiError, request, saveToken, SESSION_EXPIRED_EVENT } from '../../src/api/client.js';
import { apiError, mockApi } from '../helpers.js';

describe('request', () => {
  it('sends JSON with the stored session token and returns the parsed body', async () => {
    saveToken('abc.def.ghi');
    const fetch = mockApi({
      'POST /api/links': ({ body }) => ({ status: 201, body: { code: 'x', echoed: body } }),
    });

    const result = await request('/api/links', { method: 'POST', body: { url: 'example.com' } });

    expect(result).toEqual({ code: 'x', echoed: { url: 'example.com' } });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://short.test/api/links');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc.def.ghi',
    });
  });

  it('turns API errors into ApiError with the server code and message', async () => {
    mockApi({
      'POST /api/links': () => apiError(409, 'alias_taken', 'That alias is already taken.'),
    });

    const error = await request('/api/links', { method: 'POST', body: {} }).catch((err) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      code: 'alias_taken',
      message: 'That alias is already taken.',
    });
  });

  it('reports a network failure in words a person understands', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await request('/api/me').catch((err) => err);

    expect(error).toMatchObject({
      code: 'network',
      message: expect.stringContaining("Can't reach"),
    });
  });

  it('returns null for 204 No Content', async () => {
    mockApi({ 'DELETE /api/links/abc': () => ({ status: 204 }) });

    expect(await request('/api/links/abc', { method: 'DELETE' })).toBeNull();
  });

  it('announces an expired session when the stored token is refused', async () => {
    saveToken('expired');
    mockApi({ 'GET /api/me': () => apiError(401, 'unauthorized', 'Your session has expired.') });
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    await request('/api/me').catch(() => {});

    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it('does not announce anything when a guest gets a 401', async () => {
    mockApi({ 'POST /api/links': () => apiError(401, 'sign_in_required', 'Sign in first.') });
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);

    await request('/api/links', { method: 'POST', body: {} }).catch(() => {});

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });
});
