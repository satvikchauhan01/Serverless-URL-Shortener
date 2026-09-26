import { Link, NavLink } from 'react-router';
import { SIGN_IN_URL } from '../api/endpoints.js';
import { useSession } from '../hooks/useSession.js';
import { AccountMenu } from './AccountMenu.jsx';
import { Button } from './Button.jsx';
import { GitHubIcon } from './Icons.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import styles from './Header.module.css';

export function Header() {
  const session = useSession();

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.wordmark} aria-label="hop/ home">
        hop<span className={styles.slash}>/</span>
      </Link>

      <nav className={styles.actions} aria-label="Main">
        {session.status === 'signed-in' && (
          <NavLink to="/dashboard" className={styles.navLink}>
            Your links
          </NavLink>
        )}
        <ThemeToggle />
        {session.status === 'signed-in' && (
          <AccountMenu user={session.user} onSignOut={session.signOut} />
        )}
        {session.status === 'guest' && (
          <Button as="a" href={SIGN_IN_URL} size="sm" variant="secondary">
            <GitHubIcon />
            Sign in
          </Button>
        )}
      </nav>
    </header>
  );
}
