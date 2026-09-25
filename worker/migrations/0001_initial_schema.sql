-- Users, their short links, and one row per click.
-- Timestamps are unix seconds so comparisons and daily bucketing stay cheap.

CREATE TABLE users (
  id         INTEGER PRIMARY KEY,
  github_id  INTEGER NOT NULL UNIQUE,
  login      TEXT    NOT NULL,
  name       TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE links (
  code        TEXT    PRIMARY KEY,
  long_url    TEXT    NOT NULL,
  user_id     INTEGER REFERENCES users (id) ON DELETE CASCADE, -- NULL for guest links
  expires_at  INTEGER,                                         -- NULL means it never expires
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- The dashboard lists one user's links, newest first.
CREATE INDEX idx_links_user_created ON links (user_id, created_at);

-- The nightly cleanup looks for links that expired long ago.
CREATE INDEX idx_links_expires ON links (expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE clicks (
  id         INTEGER PRIMARY KEY,
  code       TEXT    NOT NULL REFERENCES links (code) ON DELETE CASCADE,
  clicked_at INTEGER NOT NULL,
  country    TEXT,
  referrer   TEXT, -- host only, e.g. news.ycombinator.com
  device     TEXT  -- desktop, mobile or tablet
);

-- Stats for one link over a time window.
CREATE INDEX idx_clicks_code_time ON clicks (code, clicked_at);
