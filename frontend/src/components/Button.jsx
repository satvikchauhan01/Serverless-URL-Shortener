import styles from './Button.module.css';

// variant: primary | secondary | ghost | danger. `as` lets a link look like a button.
export function Button({
  as: Element = 'button',
  variant = 'secondary',
  size = 'md',
  busy = false,
  className = '',
  children,
  ...rest
}) {
  const props = Element === 'button' ? { type: 'button', ...rest } : rest;
  return (
    <Element
      className={`${styles.button} ${styles[variant]} ${styles[size]} ${className}`}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </Element>
  );
}
