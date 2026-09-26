import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { purgeExpiredLinks } from './jobs/cleanup.js';
import { errorResponse, handleError, handleNotFound } from './lib/errors.js';
import auth from './routes/auth.js';
import health from './routes/health.js';
import links from './routes/links.js';
import me from './routes/me.js';
import redirects from './routes/redirects.js';

const MAX_BODY_BYTES = 10 * 1024;

const app = new Hono();

// The frontend lives on another origin (Cloudflare Pages), and it is the only one allowed
// to call the API from a browser.
app.use('/api/*', (c, next) =>
  cors({
    origin: c.env.FRONTEND_URL,
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE'],
    maxAge: 600,
  })(c, next),
);

app.use(
  '/api/*',
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) => errorResponse(c, 413, 'payload_too_large', 'The request body is too large.'),
  }),
);

app.route('/api/auth', auth);
app.route('/api/health', health);
app.route('/api/links', links);
app.route('/api/me', me);
app.route('/', redirects);

app.onError(handleError);
app.notFound(handleNotFound);

export default {
  fetch: app.fetch,
  async scheduled(controller, env) {
    await purgeExpiredLinks(env.DB, controller.scheduledTime);
  },
};
