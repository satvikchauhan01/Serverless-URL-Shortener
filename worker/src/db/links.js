// SQL for the links table. Rows come back in their database shape; the routes decide how
// to present them.

const LINK_COLUMNS = 'rowid, code, long_url, expires_at, click_count, created_at';

export function findLinkByCode(db, code) {
  return db.prepare('SELECT long_url, expires_at FROM links WHERE code = ?').bind(code).first();
}

export async function isCodeTaken(db, code) {
  const row = await db.prepare('SELECT 1 FROM links WHERE code = ?').bind(code).first();
  return row !== null;
}

// Someone else's link comes back as null, exactly like a missing one.
export function findOwnedLink(db, code, userId) {
  return db
    .prepare(`SELECT ${LINK_COLUMNS} FROM links WHERE code = ? AND user_id = ?`)
    .bind(code, userId)
    .first();
}

// Returns the stored row, or null when the code is already taken.
export function insertLink(db, { code, longUrl, expiresAt, userId }) {
  return db
    .prepare(
      `INSERT INTO links (code, long_url, expires_at, user_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (code) DO NOTHING
       RETURNING ${LINK_COLUMNS}`,
    )
    .bind(code, longUrl, expiresAt, userId)
    .first();
}

// Newest first. The cursor is the (created_at, rowid) of the last row already shown;
// rowid breaks ties between links created in the same second.
export async function listLinksForUser(db, userId, { search, cursor, limit }) {
  const conditions = ['user_id = ?'];
  const params = [userId];
  if (search) {
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push("(code LIKE ? ESCAPE '\\' OR long_url LIKE ? ESCAPE '\\')");
    params.push(pattern, pattern);
  }
  if (cursor) {
    conditions.push('(created_at, rowid) < (?, ?)');
    params.push(cursor.createdAt, cursor.rowid);
  }

  const { results } = await db
    .prepare(
      `SELECT ${LINK_COLUMNS} FROM links
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC, rowid DESC
       LIMIT ?`,
    )
    .bind(...params, limit)
    .all();
  return results;
}

export function updateOwnedLink(db, code, userId, { longUrl, expiresAt }) {
  return db
    .prepare(
      `UPDATE links SET long_url = ?, expires_at = ?
       WHERE code = ? AND user_id = ?
       RETURNING ${LINK_COLUMNS}`,
    )
    .bind(longUrl, expiresAt, code, userId)
    .first();
}

// Returns false when there was no such link in the user's account.
export async function deleteOwnedLink(db, code, userId) {
  const row = await db
    .prepare('DELETE FROM links WHERE code = ? AND user_id = ? RETURNING code')
    .bind(code, userId)
    .first();
  return row !== null;
}

// Returns how many links were deleted. Their clicks go too, through ON DELETE CASCADE,
// which is also why the count comes from RETURNING: D1's `changes` includes those clicks.
export async function deleteLinksExpiredBefore(db, cutoff) {
  const { results } = await db
    .prepare('DELETE FROM links WHERE expires_at < ? RETURNING code')
    .bind(cutoff)
    .all();
  return results.length;
}
