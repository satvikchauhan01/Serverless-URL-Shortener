# Serverless URL Shortener

A URL shortener built entirely on Cloudflare's serverless platform: a Worker serves the
API and the redirects, D1 stores the data, and a React frontend runs on Cloudflare Pages.

This is a work in progress. [ROADMAP.md](ROADMAP.md) shows where things stand and
[REQUIREMENTS.md](REQUIREMENTS.md) defines the full scope.

## Running the Worker locally

You need Node.js 22 or newer. No Cloudflare account is needed for local development:
Wrangler runs the Worker and a local copy of D1 on your machine.

```bash
cd worker
npm install
npm run db:migrate   # creates the local D1 database from migrations/
npm run dev          # serves the Worker on http://localhost:8787
```

Shorten a link, then follow it:

```bash
curl -X POST http://localhost:8787/api/links \
  -H 'Content-Type: application/json' \
  -d '{"url": "developers.cloudflare.com/workers/"}'

curl -i http://localhost:8787/<code>
```

## Tests and checks

```bash
cd worker
npm test               # runs inside the Workers runtime against a fresh D1 database
npm run lint
npm run format:check
```
