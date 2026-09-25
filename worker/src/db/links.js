// SQL for the links table. Rows come back in their database shape; the routes decide how
// to present them.

export function findLinkByCode(db, code) {
  return db.prepare('SELECT long_url FROM links WHERE code = ?').bind(code).first();
}

// Returns the stored row, or null when the code is already taken.
export function insertLink(db, { code, longUrl }) {
  return db
    .prepare(
      `INSERT INTO links (code, long_url)
       VALUES (?, ?)
       ON CONFLICT (code) DO NOTHING
       RETURNING code, long_url, expires_at, created_at`,
    )
    .bind(code, longUrl)
    .first();
}
