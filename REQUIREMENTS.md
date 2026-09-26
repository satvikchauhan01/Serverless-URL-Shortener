# Requirements

This file is the contract for the project. The work is complete only when **every box
below is checked** and the final audit in Phase 6 has re-verified each item on the
production deployment. Anything not listed here is out of scope until it is added here
first.

A box is checked when its requirement is implemented and covered by an automated test
or, where a test is not practical, a documented manual check. Requirement IDs are
referenced from `ROADMAP.md`, from tests and from commit messages.

## 1. Stack and platform

- [x] **STK-1** Backend: one Cloudflare Worker written in JavaScript (ES modules), routed with Hono.
- [x] **STK-2** Database: Cloudflare D1. The schema changes only through numbered SQL migrations in `worker/migrations/`, applied with Wrangler.
- [x] **STK-3** Frontend: a React single-page app in JavaScript (JSX), built with Vite and hosted on Cloudflare Pages.
- [x] **STK-4** Styling is hand-written CSS (CSS Modules plus shared design tokens). No component kits or pre-styled frameworks (MUI, Chakra, Bootstrap, shadcn/ui, DaisyUI).
- [x] **STK-5** Local development needs no external service: the Worker runs under `wrangler dev` with a local D1 database, the frontend under the Vite dev server.
- [x] **STK-6** Hosted resources (D1 database, Pages project, GitHub OAuth app, secrets) live in the owner's accounts. Their IDs and credentials come from the owner and are never invented or committed.
- [x] **STK-7** Normal demo traffic stays inside the Cloudflare free plan.

## 2. Short links

- [x] **LNK-1** `POST /api/links` with `{ "url": "..." }` creates a link and answers `201` with `{ code, shortUrl, longUrl, expiresAt, expired, clickCount, createdAt }`.
- [x] **LNK-2** Generated codes are 7 base62 characters from `crypto.getRandomValues`, without modulo bias. A collision is retried with a fresh code.
- [x] **LNK-3** Destination rules: input is trimmed; `https://` is added when no scheme is given; only `http` and `https` are accepted; at most 2048 characters; the host must contain a dot; URLs with embedded credentials (`user:pass@`) and URLs pointing at the shortener itself are rejected. Violations answer `400 invalid_url` with a message a person can act on.
- [x] **LNK-4** Custom aliases: 3–32 characters from `A–Z a–z 0–9 _ -`. Bad format → `400 invalid_alias`; reserved words (`api`, `dashboard`, `login`, … compared case-insensitively) → `400 alias_reserved`; an alias already in use → `409 alias_taken`.
- [x] **LNK-5** `GET /api/links/availability?alias=...` answers `{ alias, available, reason }` so the form can check an alias while the user types.
- [x] **LNK-6** A link may carry `expiresAt` (ISO 8601). It must be in the future, otherwise `400 invalid_expiry`.
- [x] **LNK-7** Owners can change a link's destination and expiry with `PATCH /api/links/:code`. The code itself never changes.
- [x] **LNK-8** Owners can delete a link with `DELETE /api/links/:code` (`204`). Its click history is deleted with it.

## 3. Redirects

- [x] **RDR-1** `GET /:code` answers `302` with the destination in `Location`. `301` is never used, so every visit reaches the Worker.
- [x] **RDR-2** An unknown code answers `404` with a small branded HTML page that links to the app.
- [x] **RDR-3** An expired link answers `410` with a branded HTML page saying the link has expired.
- [x] **RDR-4** The redirect never waits for analytics: the click is written through `ctx.waitUntil()`.
- [x] **RDR-5** `GET /` on the short-link host redirects to the frontend.

## 4. Click analytics

- [x] **ANL-1** Each human `GET` of a live link stores one click with its time, country (`request.cf.country`), referrer host and device class (desktop, mobile or tablet). IP addresses and raw user-agent strings are never stored.
- [x] **ANL-2** Bots and link-preview crawlers (Slack, Discord, WhatsApp, Telegram, X/Twitter, Facebook, LinkedIn, search engines, generic `bot`/`crawler`/`spider` agents) and `HEAD` requests are redirected but not counted.
- [x] **ANL-3** `links.click_count` always equals the number of stored clicks for that link: the insert and the increment run in one D1 batch.
- [x] **ANL-4** `GET /api/links/:code/stats` (owner only) returns total clicks, the last click time, a zero-filled daily series for the last 30 days, the top 5 countries, the top 5 referrers and the device split.

## 5. QR codes

- [x] **QR-1** Every link shows a QR code of its short URL, both right after creation and in the dashboard.
- [x] **QR-2** The QR code downloads as PNG and as SVG, with the link code in the file name.
- [x] **QR-3** QR codes are generated in the browser. There is no backend endpoint for them.

## 6. Accounts

- [x] **AUTH-1** Sign-in uses GitHub OAuth (authorization-code flow) with a random `state` value that is verified on the callback. The only scope requested is `read:user`.
- [x] **AUTH-2** Users are created or updated by GitHub id, storing login, display name and avatar URL.
- [x] **AUTH-3** After sign-in the Worker issues an HS256 JWT signed with `JWT_SECRET` and valid for 7 days. The frontend sends it as `Authorization: Bearer <token>`. A missing, invalid or expired token on a protected route answers `401 unauthorized`.
- [x] **AUTH-4** `GET /api/me` returns the profile plus totals (number of links, total clicks).
- [x] **AUTH-5** Signing out discards the token in the browser. Tokens are stateless, so their 7-day lifetime is a documented trade-off.
- [x] **AUTH-6** Guests (no token) can create links with a generated code only, and those links always expire 7 days after creation. A guest request that includes an alias or an expiry answers `401 sign_in_required`.

## 7. Link management

- [x] **MNG-1** `GET /api/links` returns the caller's links, newest first, 20 per page with cursor pagination, each with its click total and expiry state. `q` filters by code or destination.
- [x] **MNG-2** On every owner-only route, a link that belongs to someone else behaves exactly like a missing one (`404`).

## 8. Rate limiting

- [x] **RL-1** Guests: 5 link creations per minute per IP address.
- [x] **RL-2** Signed-in users: 30 link creations per minute per user.
- [x] **RL-3** Alias availability checks: 60 per minute per IP address.
- [x] **RL-4** Sign-in endpoints: 10 per minute per IP address.
- [x] **RL-5** Going over a limit answers `429 rate_limited` with a `Retry-After` header. Limits use the Workers Rate Limiting binding.

## 9. API conventions

- [x] **API-1** JSON in and out. Every error has the shape `{ "error": { "code": "...", "message": "..." } }` with the matching HTTP status.
- [x] **API-2** Malformed JSON answers `400 invalid_json`. Request bodies over 10 KB answer `413 payload_too_large`.
- [x] **API-3** CORS allows only the configured frontend origin, answers preflight requests and permits the `Authorization` and `Content-Type` headers.
- [x] **API-4** `GET /api/health` runs a trivial D1 query and answers `200 { "ok": true }`, or `503 { "ok": false }` when the database is unreachable.
- [x] **API-5** Unexpected errors are logged by the Worker and answer `500 internal` without leaking details.

Endpoint summary:

| Method | Path                        | Access        | Success             |
| ------ | --------------------------- | ------------- | ------------------- |
| GET    | `/:code`                    | public        | 302                 |
| GET    | `/`                         | public        | 302 to the frontend |
| GET    | `/api/health`               | public        | 200                 |
| POST   | `/api/links`                | guest or user | 201                 |
| GET    | `/api/links/availability`   | public        | 200                 |
| GET    | `/api/links`                | user          | 200                 |
| GET    | `/api/links/:code/stats`    | owner         | 200                 |
| PATCH  | `/api/links/:code`          | owner         | 200                 |
| DELETE | `/api/links/:code`          | owner         | 204                 |
| GET    | `/api/auth/github`          | public        | 302 to GitHub       |
| GET    | `/api/auth/github/callback` | public        | 302 to the frontend |
| GET    | `/api/me`                   | user          | 200                 |

## 10. Maintenance

- [x] **OPS-1** A daily Cron Trigger deletes links that expired more than 30 days ago, together with their clicks.

## 11. Frontend

- [x] **UI-1** Routes: `/` (shorten), `/auth/callback`, `/dashboard`, `/links/:code` (stats) and a not-found page for anything else.
- [x] **UI-2** A deliberate visual identity, defined once as design tokens (colour, type scale, spacing, radii, shadows). It must not look like a generated template: no purple/blue gradient hero, no glassmorphism, no emoji used as icons, no filler marketing copy.
- [x] **UI-3** Shorten form: validates the URL while typing, submits on Enter, shows a pending state and shows API errors inline next to the field they belong to.
- [x] **UI-4** Extra form fields for signed-in users: an alias field with a debounced live availability check, and expiry presets (1 day, 7 days, 30 days, custom date, never).
- [x] **UI-5** Result card: the short URL, a copy button with visible confirmation, a QR preview, PNG and SVG downloads, and a way to shorten another link.
- [x] **UI-6** Dashboard: totals (links, clicks), search, and a paginated list with copy, QR, stats, edit and delete on every row. Expired links are clearly marked.
- [x] **UI-7** Delete with undo: the row disappears at once and a toast offers Undo for 5 seconds before the delete request is sent.
- [x] **UI-8** An edit dialog for destination and expiry, with the same validation as creation.
- [x] **UI-9** Stats page: a clicks-over-time chart with hover tooltips, top countries, top referrers, device split and totals, plus an empty state for links without clicks.
- [x] **UI-10** Every view that loads data has a loading, an empty and an error state.
- [x] **UI-11** Works from 360 px wide screens to large desktops without horizontal scrolling.
- [x] **UI-12** Accessible: every action reachable by keyboard, visible focus, labelled controls, WCAG AA contrast, and motion reduced under `prefers-reduced-motion`.
- [x] **UI-13** Light and dark themes: follows the system setting by default, with a toggle that is remembered.
- [x] **UI-14** "Sign in with GitHub", an account menu with avatar and sign-out, and a clean return to sign-in when the session expires.

## 12. Security

- [x] **SEC-1** Secrets (`JWT_SECRET`, `GITHUB_CLIENT_SECRET`) are set with `wrangler secret put` in production and `worker/.dev.vars` locally. `.dev.vars` is git-ignored and `.dev.vars.example` documents it.
- [x] **SEC-2** Every SQL statement uses bound parameters.
- [x] **SEC-3** The UI never renders HTML from data (no `dangerouslySetInnerHTML`), and only validated `http(s)` destinations ever reach an `href`.
- [x] **SEC-4** The Worker's HTML pages and the Pages site send security headers: a Content-Security-Policy, `X-Content-Type-Options: nosniff`, a `Referrer-Policy`, and framing disabled.
- [x] **SEC-5** Only public GitHub profile data is stored. No email addresses, no IP addresses.

## 13. Performance

- [x] **PRF-1** The redirect does exactly one D1 read, an indexed lookup by code, before responding.
- [x] **PRF-2** No API query scans the whole `links` or `clicks` table. Every lookup is served by an index, checked with `EXPLAIN QUERY PLAN`.
- [x] **PRF-3** The production landing page scores at least 90 in Lighthouse for Performance, Accessibility, Best Practices and SEO.

## 14. Code quality and structure

- [x] **CQ-1** JavaScript only, with React only where there is UI.
- [x] **CQ-2** The code reads like a person wrote it: comments explain intent and non-obvious decisions. No commented-out code, dead code, placeholder lines or leftover debug logging.
- [x] **CQ-3** The repository follows the layout in section 17: one responsibility per file, no stray files at the root.
- [x] **CQ-4** ESLint passes with zero warnings and Prettier formatting is enforced in both packages. CI checks both.
- [x] **CQ-5** Every commit is made and pushed by the owner from their own machine; Claude never commits or pushes. Each phase ends with at least one descriptive commit.

## 15. Testing

- [x] **TST-1** Worker tests run inside the Workers runtime (Vitest with `@cloudflare/vitest-pool-workers`) against a freshly migrated local D1 database.
- [x] **TST-2** Every endpoint has tests for its success path and for each of its documented errors.
- [x] **TST-3** Tests cover redirects, expiry, bot filtering, click counting, rate limiting, the OAuth callback (with GitHub mocked), JWT checks and ownership rules.
- [x] **TST-4** Frontend tests (Vitest with Testing Library) cover the validation helpers, the API client's error handling, the shorten form and delete-with-undo.
- [x] **TST-5** The full test suite passes in CI.

## 16. Delivery and documentation

- [x] **DEP-1** GitHub Actions runs lint, tests and the frontend build on every push and pull request.
- [x] **DEP-2** A push to `main` that passes the checks applies the D1 migrations, deploys the Worker and deploys the frontend to Pages, using `cloudflare/wrangler-action@v4`.
- [x] **DEP-3** The pipeline needs only the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.
- [x] **DEP-4** Production is live: the Worker on `*.workers.dev`, the frontend on `*.pages.dev`, and GitHub sign-in works end to end.
- [x] **DEP-5** Environment-specific values (API URL, frontend URL, OAuth client id) come from configuration, never from source code.
- [x] **DOC-1** `README.md` covers what the project is, live links, screenshots, an architecture diagram, features, the stack, an API reference, local setup, deployment, design decisions and trade-offs, and how to run the tests.
- [x] **DOC-2** `ROADMAP.md` reflects real progress at the end of every phase.

## 17. Repository layout

```
.
├── README.md
├── ROADMAP.md
├── REQUIREMENTS.md
├── docs/screenshots/       images used in the README
├── .github/workflows/      CI and deployment
├── worker/                 Cloudflare Worker: API and redirects
│   ├── migrations/         D1 schema as numbered SQL files
│   ├── src/
│   │   ├── index.js        app wiring and Worker exports
│   │   ├── routes/         HTTP handlers, one file per area
│   │   ├── middleware/     authentication and rate limiting
│   │   ├── db/             SQL queries, one file per table
│   │   ├── lib/            shared helpers: codes, URL checks, time, visits, errors
│   │   ├── jobs/           scheduled work run by Cron Triggers
│   │   └── pages/          HTML for the 404 and 410 pages
│   └── test/               test suites, mirroring src/
└── frontend/               React app deployed to Cloudflare Pages
    ├── public/
    ├── src/
    │   ├── api/            fetch wrapper and endpoint calls
    │   ├── components/     reusable UI pieces
    │   ├── pages/          one component per route
    │   ├── hooks/
    │   ├── lib/            helpers such as validation and formatting
    │   └── styles/         design tokens and global styles
    └── test/               test suites, mirroring src/
```

## 18. Out of scope

Not built unless first added above: custom domains per user, teams or shared
workspaces, billing, password-protected links, bulk import, link-in-bio pages, UTM
builders, A/B redirects, email/password sign-in or other OAuth providers, an admin
panel, translations, a browser extension or a mobile app. A custom domain for the
whole app can be attached later without code changes.

## Definition of done

1. Every box in sections 1–16 is checked.
2. The Phase 6 audit re-verified every item against the production URLs.
3. CI is green on `main`.
4. The live links in the README work.
