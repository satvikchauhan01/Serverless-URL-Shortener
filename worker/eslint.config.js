import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  globalIgnores(['.wrangler/']),
  {
    files: ['**/*.js'],
    extends: [js.configs.recommended],
    // The Workers runtime exposes the same globals as a service worker.
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
]);
