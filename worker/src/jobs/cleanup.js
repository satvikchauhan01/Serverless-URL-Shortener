import { deleteLinksExpiredBefore } from '../db/links.js';
import { toIsoString, unixSeconds } from '../lib/time.js';

// Expired links are kept for 30 days so their owners can still look at the numbers.
const KEEP_EXPIRED_SECONDS = 30 * 24 * 60 * 60;

export async function purgeExpiredLinks(db, scheduledTime) {
  const cutoff = unixSeconds(scheduledTime) - KEEP_EXPIRED_SECONDS;
  const deleted = await deleteLinksExpiredBefore(db, cutoff);
  console.log(
    `Expired link cleanup removed ${deleted} link(s) that expired before ${toIsoString(cutoff)}`,
  );
}
