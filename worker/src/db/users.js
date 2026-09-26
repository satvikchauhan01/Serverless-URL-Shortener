// SQL for the users table.

// Signing in again refreshes the profile, since people change names and avatars.
export function upsertGithubUser(db, { githubId, login, name, avatarUrl }) {
  return db
    .prepare(
      `INSERT INTO users (github_id, login, name, avatar_url)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (github_id) DO UPDATE
         SET login = excluded.login, name = excluded.name, avatar_url = excluded.avatar_url
       RETURNING id, login`,
    )
    .bind(githubId, login, name, avatarUrl)
    .first();
}

export function findUserWithTotals(db, id) {
  return db
    .prepare(
      `SELECT u.id, u.login, u.name, u.avatar_url,
              (SELECT COUNT(*) FROM links WHERE user_id = u.id) AS link_count,
              (SELECT COALESCE(SUM(click_count), 0) FROM links WHERE user_id = u.id) AS click_count
       FROM users u
       WHERE u.id = ?`,
    )
    .bind(id)
    .first();
}
