import { useState } from 'react';
import { ResultCard } from '../components/ResultCard.jsx';
import { ShortenForm } from '../components/ShortenForm.jsx';
import { useSession } from '../hooks/useSession.js';
import styles from './HomePage.module.css';

export function HomePage() {
  const session = useSession();
  const [created, setCreated] = useState(null);
  const signedIn = session.status === 'signed-in';

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <p className={styles.kicker}>URL shortener</p>
        <h1 className={styles.title}>
          Long link in,
          <br />
          short link out<span className={styles.dot}>.</span>
        </h1>
        <p className={styles.lede}>
          Paste an address to get a short link and a QR code.
          {signedIn
            ? ' Pick an alias or an expiry below, and follow the clicks from your dashboard.'
            : ' It takes a second and no account.'}
        </p>
      </div>

      {created ? (
        <ResultCard link={created} signedIn={signedIn} onReset={() => setCreated(null)} />
      ) : (
        <ShortenForm signedIn={signedIn} onCreated={setCreated} />
      )}
    </div>
  );
}
