import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Writes Cloudflare Pages' _headers file into the build. It is generated rather than
// kept in public/ because the policy has to name the API origin, which differs per
// environment. Inline styles are allowed for the style attributes React sets (chart bar
// widths, tooltip positions); scripts may only come from the site itself.
function securityHeaders(apiUrl) {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://avatars.githubusercontent.com",
    "font-src 'self'",
    `connect-src 'self' ${new URL(apiUrl).origin}`,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  return {
    name: 'security-headers',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: [
          '/*',
          `  Content-Security-Policy: ${policy}`,
          '  X-Content-Type-Options: nosniff',
          '  Referrer-Policy: strict-origin-when-cross-origin',
          '  X-Frame-Options: DENY',
          '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
          '',
        ].join('\n'),
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const { VITE_API_URL } = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react(), VITE_API_URL && securityHeaders(VITE_API_URL)],
    test: {
      environment: 'jsdom',
      setupFiles: ['./test/setup.js'],
      env: { VITE_API_URL: 'https://short.test' },
    },
  };
});
