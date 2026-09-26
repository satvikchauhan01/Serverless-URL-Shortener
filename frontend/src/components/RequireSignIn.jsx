import { SIGN_IN_URL } from '../api/endpoints.js';
import { useSession } from '../hooks/useSession.js';
import { Button } from './Button.jsx';
import { GitHubIcon } from './Icons.jsx';
import styles from '../pages/StatusPage.module.css';

// Wraps pages that only make sense with an account.
export function RequireSignIn({ children }) {
  const session = useSession();

  if (session.status === 'loading') {
    return (
      <p className={styles.page} aria-live="polite">
        Loading your account…
      </p>
    );
  }
  if (session.status !== 'signed-in') {
    return (
      <div className={styles.page}>
        <p className={styles.label}>Sign in needed</p>
        <h1 className={styles.title}>Your links live behind a sign-in.</h1>
        <p className={styles.text}>
          Sign in with GitHub to see every link you have made, how often each one is clicked, and to
          edit or delete them.
        </p>
        <div className={styles.actions}>
          <Button as="a" href={SIGN_IN_URL} variant="primary">
            <GitHubIcon />
            Sign in with GitHub
          </Button>
        </div>
      </div>
    );
  }
  return children;
}
