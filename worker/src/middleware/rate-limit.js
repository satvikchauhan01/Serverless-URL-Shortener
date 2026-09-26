import { errorResponse } from '../lib/errors.js';

// Every limiter in wrangler.jsonc counts over a 60-second window.
const WINDOW_SECONDS = 60;

// Guards a route with one of the Rate Limiting bindings. By default each client IP gets
// its own budget. The counts are approximate and kept per Cloudflare location: good for
// slowing down abuse, not meant as exact quotas.
export function rateLimit(bindingName, keyOf = clientIp) {
  return async (c, next) => {
    const { success } = await c.env[bindingName].limit({ key: keyOf(c) });
    if (!success) {
      c.header('Retry-After', String(WINDOW_SECONDS));
      return errorResponse(c, 429, 'rate_limited', 'Too many requests. Try again in a minute.');
    }
    await next();
  };
}

function clientIp(c) {
  return c.req.header('CF-Connecting-IP') ?? 'unknown';
}
