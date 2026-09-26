import styles from './StatTile.module.css';

export function StatTile({ label, value, note, hero = false }) {
  return (
    <div className={styles.tile}>
      <p className={styles.label}>{label}</p>
      <p className={hero ? `${styles.value} ${styles.hero}` : styles.value}>{value}</p>
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}
