// The pages a visitor sees instead of a redirect. Plain HTML with inline styles: no
// scripts and no external files, so there is nothing to load and little to attack.

const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  // Nothing on these pages loads or runs, so the policy can switch almost everything off.
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

const STYLES = `
  :root {
    color-scheme: light dark;
    --paper: #f7f6f2;
    --ink: #1d1c1a;
    --muted: #6b6860;
    --accent: #c2410c;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --paper: #151413;
      --ink: #ecebe6;
      --muted: #a09d94;
      --accent: #ff8a4c;
    }
  }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
    box-sizing: border-box;
    background: var(--paper);
    color: var(--ink);
    font: 17px/1.55 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }
  main {
    max-width: 34rem;
  }
  .label {
    margin: 0;
    color: var(--muted);
    font: 500 13px/1 ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h1 {
    margin: 12px 0 16px;
    font-size: clamp(30px, 7vw, 42px);
    line-height: 1.1;
    letter-spacing: -0.02em;
  }
  p {
    margin: 0 0 28px;
  }
  code {
    padding: 2px 6px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--ink) 8%, transparent);
    font: 0.92em ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
    overflow-wrap: anywhere;
  }
  a {
    color: var(--accent);
    font-weight: 600;
    text-underline-offset: 4px;
  }
  a:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
`;

const EXPIRY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'UTC',
});

// shortLink is left out when the path could never have been a short link.
export function linkNotFoundResponse({ shortLink, appUrl }) {
  const message = shortLink
    ? `<code>${escapeHtml(shortLink)}</code> doesn't lead anywhere. Short links are case-sensitive, so check the spelling. It may also have been deleted.`
    : 'There is no short link at this address.';

  return statusPage(404, {
    label: '404 · Not found',
    title: "This short link doesn't exist",
    message,
    appUrl,
  });
}

export function linkExpiredResponse({ shortLink, expiredAt, appUrl }) {
  return statusPage(410, {
    label: '410 · Expired',
    title: 'This link has expired',
    message: `<code>${escapeHtml(shortLink)}</code> stopped working on ${EXPIRY_FORMAT.format(expiredAt * 1000)} UTC.`,
    appUrl,
  });
}

function statusPage(status, { label, title, message, appUrl }) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>${title}</title>
    <style>${STYLES}</style>
  </head>
  <body>
    <main>
      <p class="label">${label}</p>
      <h1>${title}</h1>
      <p>${message}</p>
      <a href="${escapeHtml(appUrl)}">Make a short link of your own</a>
    </main>
  </body>
</html>
`;
  return new Response(html, { status, headers: PAGE_HEADERS });
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}
