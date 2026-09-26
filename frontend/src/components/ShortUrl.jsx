import styles from './ShortUrl.module.css';

// A short link shown as its host, small, over its code, large. Hosts can be long
// (url-shortener.<account>.workers.dev) and the code is the part people remember, so a
// long host never breaks the code apart.
export function ShortUrl({ link }) {
  return (
    <>
      <span className={styles.host}>{new URL(link.shortUrl).host}/</span>
      <span className={styles.code}>{link.code}</span>
    </>
  );
}
