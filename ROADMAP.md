# Roadmap

The project is built in six phases, one at a time. There is no fixed date: the
deadline is the day Phase 6 meets its exit criteria. What "finished" means is defined in
[`REQUIREMENTS.md`](REQUIREMENTS.md); this file only covers the order of the work.

## Working agreement

- One phase at a time. Claude builds and verifies each phase, then hands the changed
  files over as a zip. The owner reviews them, commits and pushes from their own machine,
  and the next phase starts from that commit. Claude never commits or pushes.
- A phase is finished when its exit criteria pass and the requirement IDs it lists are
  checked in `REQUIREMENTS.md`.
- Local development uses local emulation only (Wrangler and Miniflare). Anything hosted,
  such as the D1 database id, the Pages project or OAuth credentials, is requested from
  the owner in the phase that needs it.
- JavaScript and React only, code that reads like a person wrote it, and the repository
  layout from section 17 of the requirements.

## Progress

| Phase | Focus                                    | Status                       |
| ----- | ---------------------------------------- | ---------------------------- |
| 1     | Foundation and the core redirect         | Done                         |
| 2     | Link features and abuse protection       | Done                         |
| 3     | Accounts and the link management API     | Done                         |
| 4     | Frontend: visual identity and shortening | Done                         |
| 5     | Frontend: dashboard and analytics        | Done                         |
| 6     | CI/CD, deployment and launch             | Waiting for the first deploy |

## Phase 1: Foundation and the core redirect

A Worker that can create a short link and redirect to it, running locally, plus the
tooling every later phase builds on.

- [x] `REQUIREMENTS.md` and this roadmap
- [x] Repository layout, `.gitignore`, shared Prettier config
- [x] `worker/` package: Hono, Wrangler config with the D1 binding, ESLint, Vitest
      running inside the Workers runtime
- [x] Migration `0001`: `users`, `links`, `clicks` and their indexes
- [x] `POST /api/links` with destination validation and random codes
- [x] `GET /:code` (302), `GET /` (to the frontend), `GET /api/health`
- [x] JSON error format, 10 KB body limit, malformed JSON handling
- [x] Tests for all of the above

Checks off: STK-1, STK-2, LNK-1, LNK-2, LNK-3, RDR-1, RDR-5, API-1, API-2, API-4,
API-5, SEC-2, TST-1

Exit criteria: `npm test` and `npm run lint` pass in `worker/`. Against `wrangler dev`,
a link created with `curl` answers its short URL with a 302.

Needed from the owner: nothing.

## Phase 2: Link features and abuse protection

The link engine becomes feature-complete: aliases, expiry, click analytics, rate limits
and housekeeping.

- [x] Custom aliases with reserved words, and the alias availability endpoint
- [x] Expiry on creation, and `410` for expired links
- [x] Branded 404 and 410 pages served with security headers
- [x] Click recording in the background (country, referrer host, device), skipping bots
      and `HEAD` requests
- [x] Rate Limiting bindings for guest link creation and availability checks, answering
      `429` with `Retry-After`
- [x] Daily Cron Trigger that removes long-expired links
- [x] LF line endings pinned in `.gitattributes`, so the checks pass on Windows too
- [x] Tests for all of the above

Checks off: LNK-4, LNK-5, LNK-6, RDR-2, RDR-3, RDR-4, ANL-1, ANL-2, ANL-3, RL-1, RL-3,
RL-5, OPS-1, PRF-1

Exit criteria: tests pass. Aliases, expiry, click counts and `429` responses can be
shown against `wrangler dev`.

Needed from the owner: nothing.

## Phase 3: Accounts and the link management API

People sign in with GitHub and manage their own links. Guests keep a limited mode.

- [x] GitHub OAuth: `state` cookie, code exchange, user upsert, JWT issuing
- [x] Auth middleware and `GET /api/me` with totals
- [x] Guest rules: generated codes only, fixed 7-day expiry
- [x] `GET /api/links` (cursor pagination, search), `GET /api/links/:code/stats`,
      `PATCH` and `DELETE`, all with ownership checks
- [x] CORS for the frontend origin; rate limits for signed-in creation and sign-in
- [x] `.dev.vars.example`, and query-plan checks for every query
- [x] Tests with GitHub mocked

Checks off: AUTH-1 to AUTH-6, LNK-7, LNK-8, MNG-1, MNG-2, ANL-4, RL-2, RL-4, API-3,
SEC-1, SEC-5, PRF-2, TST-2, TST-3

Exit criteria: tests pass, including the full OAuth callback with GitHub mocked.

Needed from the owner: a GitHub OAuth app for local development, with the callback URL
`http://localhost:8787/api/auth/github/callback`. Its client id and secret go into
`worker/.dev.vars` on the owner's machine. The automated tests do not need it.

## Phase 4: Frontend, visual identity and shortening

The public face of the product: the design system and the complete create-a-link flow.

- [x] `frontend/` package: Vite, React Router, ESLint, Prettier, Vitest and Testing
      Library
- [x] Design tokens, typography, light and dark themes with a toggle, in-house components
- [x] API client with error handling and token storage
- [x] Home page: shorten form with live validation; alias availability check and expiry
      presets for signed-in users
- [x] Result card with copy, QR preview, and PNG and SVG downloads
- [x] Sign in with GitHub, auth callback, account menu, sign-out and session-expiry
      handling
- [x] Not-found page
- [x] Tests for the validation helpers, the API client and the shorten form

Checks off: STK-3, STK-4, STK-5, UI-2, UI-3, UI-4, UI-5, UI-13, UI-14, QR-2, QR-3, SEC-3

Exit criteria: tests and lint pass. The full shortening flow works against the local
Worker, as a guest and signed in.

Needed from the owner: nothing beyond the Phase 3 OAuth app.

## Phase 5: Frontend, dashboard and analytics

Signed-in users can see, search and manage everything they have made, with real
analytics.

- [x] Dashboard: totals, search, pagination; copy, QR, stats, edit and delete on every row
- [x] Delete with a 5-second undo, and the edit dialog
- [x] Stats page: clicks over time with tooltips, countries, referrers, devices
- [x] Loading, empty and error states everywhere
- [x] Responsive pass from 360 px, and an accessibility pass
- [x] Tests for delete-with-undo and the dashboard states

Checks off: QR-1, UI-1, UI-6, UI-7, UI-8, UI-9, UI-10, UI-11, UI-12, TST-4

Exit criteria: tests and lint pass. Every dashboard and stats interaction works against
the local Worker with seeded data.

Needed from the owner: nothing.

## Phase 6: CI/CD, deployment and launch

The project goes live, deploys itself and is documented for the portfolio.

- [x] GitHub Actions: checks on every push and pull request; on `main`, apply migrations,
      deploy the Worker, deploy Pages (`cloudflare/wrangler-action@v4`)
- [ ] Production configuration: D1 database id, variables, secrets, production OAuth app,
      Pages project
- [x] Security headers for the Pages site
- [x] README with screenshots, architecture diagram, API reference, setup, deployment
      and design trade-offs
- [x] Lighthouse run on the production build (desktop 100/100/100/100, mobile 99/100/100/100); to repeat on the live site
- [ ] Final audit: every requirement re-verified against the production URLs

Checks off: STK-6, STK-7, SEC-4, CQ-1 to CQ-5, PRF-3, TST-5, DEP-1 to DEP-5, DOC-1,
DOC-2

Exit criteria: the definition of done in `REQUIREMENTS.md` is met.

Needed from the owner: the Cloudflare account id and an API token (stored as GitHub
repository secrets), the D1 database id printed by `wrangler d1 create url-shortener`, a
production GitHub OAuth app whose secret the owner sets with `wrangler secret put`, and
the push of this work to `main`, which triggers the first deploy.
