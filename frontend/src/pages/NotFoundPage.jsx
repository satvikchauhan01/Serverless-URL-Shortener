import { Link } from 'react-router';
import { Button } from '../components/Button.jsx';
import styles from './StatusPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <p className={styles.label}>404 · Not found</p>
      <h1 className={styles.title}>There's no page here.</h1>
      <p className={styles.text}>
        Looking for a short link? Those live on the short-link address, not on this site.
      </p>
      <div className={styles.actions}>
        <Button as={Link} to="/" variant="primary">
          Shorten a link
        </Button>
      </div>
    </div>
  );
}
