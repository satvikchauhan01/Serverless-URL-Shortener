import { useEffect, useRef } from 'react';
import { SIGN_IN_URL } from '../api/endpoints.js';
import { displayUrl, formatDate } from '../lib/format.js';
import { Button } from './Button.jsx';
import { CopyButton } from './CopyButton.jsx';
import { ExternalIcon } from './Icons.jsx';
import { QrCode } from './QrCode.jsx';
import styles from './ResultCard.module.css';
import { ShortUrl } from './ShortUrl.jsx';

export function ResultCard({ link, signedIn, onReset }) {
  const heading = useRef(null);

  // Screen readers and keyboards land on the new link instead of the vanished form.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section className={styles.card} aria-labelledby="result-heading">
      <div className={styles.main}>
        <p className={styles.label}>Your short link</p>
        <h2 id="result-heading" ref={heading} tabIndex={-1} className={styles.shortUrl}>
          <ShortUrl link={link} />
        </h2>
        <p className={styles.destination}>
          <span aria-hidden="true">↳</span> {displayUrl(link.longUrl)}
        </p>

        <div className={styles.actions}>
          <CopyButton value={link.shortUrl} variant="primary" />
          <Button as="a" href={link.shortUrl} target="_blank" rel="noopener noreferrer">
            <ExternalIcon />
            Open
          </Button>
        </div>

        <p className={styles.meta}>
          {link.expiresAt ? `Works until ${formatDate(link.expiresAt)}.` : 'Never expires.'}{' '}
          {signedIn ? (
            'It is saved in your links, where its clicks show up.'
          ) : (
            <>
              Guest links don't come with click stats. <a href={SIGN_IN_URL}>Sign in</a> to see who
              clicks.
            </>
          )}
        </p>

        <Button variant="ghost" onClick={onReset} className={styles.again}>
          Shorten another link
        </Button>
      </div>

      <QrCode value={link.shortUrl} code={link.code} />
    </section>
  );
}
