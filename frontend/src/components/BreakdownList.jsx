import { formatCount } from '../lib/format.js';
import styles from './BreakdownList.module.css';

// A short ranked list (top countries, referrers, devices) drawn as horizontal bars.
// One series, so one colour and no legend; the value sits at the tip of each bar.
export function BreakdownList({ title, rows, emptyText }) {
  const max = Math.max(0, ...rows.map((row) => row.clicks));

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>{title}</h2>
      {rows.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <ol className={styles.list}>
          {rows.map((row) => (
            <li key={row.label} className={styles.row}>
              <span className={styles.label}>{row.label}</span>
              <span className={styles.track} aria-hidden="true">
                <span className={styles.bar} style={{ width: `${(row.clicks / max) * 100}%` }} />
              </span>
              <span className={styles.value}>{formatCount(row.clicks)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
