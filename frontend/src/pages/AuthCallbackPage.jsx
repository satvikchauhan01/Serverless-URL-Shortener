import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { SIGN_IN_URL } from '../api/endpoints.js';
import { Button } from '../components/Button.jsx';
import { GitHubIcon } from '../components/Icons.jsx';
import { useSession } from '../hooks/useSession.js';
import styles from './StatusPage.module.css';

const MESSAGES = {
  access_denied: 'You cancelled the sign-in on GitHub.',
  invalid_state: 'That sign-in link was stale or had been tampered with.',
  github_failed: "GitHub didn't confirm who you are. It usually works on a second try.",
};

// The Worker sends the browser here with #token=... or #error=... after GitHub sign-in.
export function AuthCallbackPage() {
  const session = useSession();
  const navigate = useNavigate();
  // Read once: the effect below wipes the fragment from the address bar.
  const [result] = useState(() => new URLSearchParams(window.location.hash.slice(1)));
  const token = result.get('token');
  const handled = useRef(false);

  useEffect(() => {
    // Keep the token out of the browser history.
    window.history.replaceState(null, '', window.location.pathname);
    // Strict mode runs effects twice in development; the token must be used once.
    if (!token || handled.current) return;
    handled.current = true;
    session.signIn(token).then(() => navigate('/dashboard', { replace: true }));
  }, [token, session, navigate]);

  if (token) {
    return (
      <div className={styles.page} aria-live="polite">
        <p className={styles.label}>Signing in</p>
        <h1 className={styles.title}>One moment…</h1>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <p className={styles.label}>Sign-in failed</p>
      <h1 className={styles.title}>That didn't work.</h1>
      <p className={styles.text}>{MESSAGES[result.get('error')] ?? 'Sign-in did not complete.'}</p>
      <div className={styles.actions}>
        <Button as="a" href={SIGN_IN_URL} variant="primary">
          <GitHubIcon />
          Try again
        </Button>
        <Button as={Link} to="/" variant="ghost">
          Back to the start
        </Button>
      </div>
    </div>
  );
}
