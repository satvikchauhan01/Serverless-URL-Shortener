import { fileURLToPath } from 'node:url';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  // Migrations are read here in Node and handed to the tests as a binding, so every run
  // builds the database from exactly the files production uses.
  const migrations = await readD1Migrations(fileURLToPath(new URL('migrations', import.meta.url)));

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          // Stand-ins for the secrets that .dev.vars holds locally and Cloudflare holds in
          // production. GitHub itself is mocked in the tests.
          bindings: {
            TEST_MIGRATIONS: migrations,
            JWT_SECRET: 'test-only-secret-that-is-long-enough-for-hs256',
            GITHUB_CLIENT_ID: 'test-client-id',
            GITHUB_CLIENT_SECRET: 'test-client-secret',
          },
        },
      }),
    ],
    test: {
      setupFiles: ['./test/setup.js'],
    },
  };
});
