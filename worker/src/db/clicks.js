const SECONDS_PER_DAY = 24 * 60 * 60;
const TOP_LIMIT = 5;

// The click row and the link's counter are written in one batch. D1 runs a batch as a
// single transaction, so click_count can never drift away from the rows in clicks.
export function recordClick(db, { code, clickedAt, country, referrer, device }) {
  return db.batch([
    db
      .prepare(
        'INSERT INTO clicks (code, clicked_at, country, referrer, device) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(code, clickedAt, country, referrer, device),
    db.prepare('UPDATE links SET click_count = click_count + 1 WHERE code = ?').bind(code),
  ]);
}

// Everything the stats page shows, read in one round trip. Every query starts from the
// (code, clicked_at) index, so a link's stats cost as many row reads as it has clicks.
export async function clickStats(db, code, since) {
  const [daily, countries, referrers, devices, last] = await db.batch([
    db
      .prepare(
        `SELECT clicked_at / ${SECONDS_PER_DAY} AS day, COUNT(*) AS clicks FROM clicks
         WHERE code = ? AND clicked_at >= ? GROUP BY day`,
      )
      .bind(code, since),
    topBy(db, 'country', code),
    topBy(db, 'referrer', code),
    topBy(db, 'device', code),
    db.prepare('SELECT MAX(clicked_at) AS last_click FROM clicks WHERE code = ?').bind(code),
  ]);

  return {
    daily: daily.results,
    countries: countries.results,
    referrers: referrers.results,
    devices: devices.results,
    lastClickAt: last.results[0].last_click,
  };
}

// Ties are broken by name so the order is the same on every load.
function topBy(db, column, code) {
  return db
    .prepare(
      `SELECT ${column}, COUNT(*) AS clicks FROM clicks
       WHERE code = ? GROUP BY ${column} ORDER BY clicks DESC, ${column} LIMIT ${TOP_LIMIT}`,
    )
    .bind(code);
}
