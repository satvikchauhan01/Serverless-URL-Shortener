import { vi } from 'vitest';

// Replaces fetch with a function that answers from `routes`, keyed by "METHOD /path".
// Each handler gets the parsed request and returns { status, body }.
export function mockApi(routes) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init = {}) => {
    const url = new URL(input);
    const method = init.method ?? 'GET';
    const handler = routes[`${method} ${url.pathname}`];
    if (!handler) throw new Error(`No mock for ${method} ${url.pathname}`);

    const request = {
      url,
      headers: init.headers ?? {},
      body: init.body ? JSON.parse(init.body) : undefined,
    };
    const { status = 200, body } = await handler(request);
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

export function apiError(status, code, message) {
  return { status, body: { error: { code, message } } };
}
