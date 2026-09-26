import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import styles from './AccountMenu.module.css';

export function AccountMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef(null);
  const firstItemRef = useRef(null);

  // Close on Escape or a click anywhere else, like a native menu.
  useEffect(() => {
    if (!open) return undefined;
    firstItemRef.current?.focus();
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    const onPointer = (event) => !rootRef.current?.contains(event.target) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        {user.avatarUrl ? (
          <img className={styles.avatar} src={user.avatarUrl} alt="" width="28" height="28" />
        ) : (
          <span className={styles.avatar} aria-hidden="true">
            {user.login.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="visually-hidden">Account menu for {user.login}</span>
      </button>

      {open && (
        <div className={styles.menu} id={menuId} role="menu">
          <p className={styles.who}>
            Signed in as <strong>{user.login}</strong>
          </p>
          <Link
            ref={firstItemRef}
            to="/dashboard"
            role="menuitem"
            className={styles.item}
            onClick={() => setOpen(false)}
          >
            Your links
          </Link>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
