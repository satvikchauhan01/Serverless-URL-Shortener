import { Hono } from 'hono';

const health = new Hono();

// A 503 here lets an uptime monitor tell "Worker up, database down" apart from "all good".
health.get('/', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1').first();
    return c.json({ ok: true });
  } catch (err) {
    console.error('Health check could not reach D1:', err);
    return c.json({ ok: false }, 503);
  }
});

export default health;
