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
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      setupFiles: ['./test/setup.js'],
    },
  };
});
