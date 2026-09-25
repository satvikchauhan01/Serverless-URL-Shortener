import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { errorResponse, handleError, handleNotFound } from './lib/errors.js';
import health from './routes/health.js';
import links from './routes/links.js';
import redirects from './routes/redirects.js';

const MAX_BODY_BYTES = 10 * 1024;

const app = new Hono();

app.use(
  '/api/*',
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) => errorResponse(c, 413, 'payload_too_large', 'The request body is too large.'),
  }),
);

app.route('/api/health', health);
app.route('/api/links', links);
app.route('/', redirects);

app.onError(handleError);
app.notFound(handleNotFound);

export default app;
