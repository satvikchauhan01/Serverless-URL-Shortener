import { useState } from 'react';
import { Outlet } from 'react-router';
import { SIGN_IN_URL } from '../api/endpoints.js';
import { useSession } from '../hooks/useSession.js';
import { Button } from './Button.jsx';
import { Header } from './Header.jsx';
import { CloseIcon } from './Icons.jsx';
import styles from './Layout.module.css';

const REPO_URL = 'https://github.com/satvikchauhan01/Serverless-URL-Shortener';

export function Layout() {
  const session = useSession();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  return (
    <div className={styles.shell}>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <Header />

      {session.expired && !bannerDismissed && (
        <div className={styles.banner} role="status">
          <p>Your session expired. Sign in again to get back to your links.</p>
          <Button as="a" href={SIGN_IN_URL} size="sm" variant="primary">
            Sign in
          </Button>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      <main id="main" className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <p>
          Runs on Cloudflare Workers, D1 and Pages. Every click is a 302, so every click counts.
        </p>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          Source on GitHub
        </a>
      </footer>
    </div>
  );
}
