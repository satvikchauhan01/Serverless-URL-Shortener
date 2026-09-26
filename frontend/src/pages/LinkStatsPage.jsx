import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { getLinkStats } from '../api/endpoints.js';
import { BreakdownList } from '../components/BreakdownList.jsx';
import { Button } from '../components/Button.jsx';
import { ClicksChart } from '../components/ClicksChart.jsx';
import { CopyButton } from '../components/CopyButton.jsx';
import { ArrowLeftIcon, ExternalIcon } from '../components/Icons.jsx';
import { QrCode } from '../components/QrCode.jsx';
import { ShortUrl } from '../components/ShortUrl.jsx';
import { StatTile } from '../components/StatTile.jsx';
import { countryName, displayUrl, formatCount, formatDate, relativeTime } from '../lib/format.js';
import { isWebUrl } from '../lib/validation.js';
import styles from './LinkStatsPage.module.css';

const DEVICE_NAMES = { desktop: 'Desktop', mobile: 'Phone', tablet: 'Tablet' };

export function LinkStatsPage() {
  const { code } = useParams();
  const [reloads, setReloads] = useState(0);
  // `code` records which link the answer belongs to, so a stale one is never shown.
  const [result, setResult] = useState(null);

  useEffect(() => {
    let current = true;
    getLinkStats(code).then(
      (stats) => current && setResult({ code, stats }),
      (error) => current && setResult({ code, error }),
    );
    return () => {
      current = false;
    };
  }, [code, reloads]);

  const back = (
    <Link to="/dashboard" className={styles.back}>
      <ArrowLeftIcon size={16} />
      Your links
    </Link>
  );

  if (!result || result.code !== code) {
    return (
      <div className={styles.page} aria-busy="true">
        {back}
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (result.error) {
    const missing = result.error.status === 404;
    return (
      <div className={styles.page}>
        {back}
        <div className={styles.state} role="alert">
          <h1>{missing ? 'No such link in your account.' : "The stats couldn't be loaded."}</h1>
          <p>{missing ? `There is no link called “${code}” among yours.` : result.error.message}</p>
          {!missing && <Button onClick={() => setReloads((count) => count + 1)}>Try again</Button>}
        </div>
      </div>
    );
  }

  const { link, daily, countries, referrers, devices, lastClickAt } = result.stats;
  const lastThirtyDays = daily.reduce((sum, day) => sum + day.clicks, 0);
  let status = 'Never expires';
  if (link.expiresAt) {
    status = `${link.expired ? 'Expired' : 'Expires'} ${formatDate(link.expiresAt)}`;
  }

  return (
    <div className={styles.page}>
      {back}

      <header className={styles.header}>
        <div className={styles.identity}>
          <h1 className={styles.code}>
            <ShortUrl link={link} />
          </h1>
          <p className={styles.destination}>
            {isWebUrl(link.longUrl) ? (
              <a href={link.longUrl} target="_blank" rel="noopener noreferrer">
                {displayUrl(link.longUrl)}
                <ExternalIcon size={14} />
              </a>
            ) : (
              displayUrl(link.longUrl)
            )}
          </p>
        </div>
        <CopyButton value={link.shortUrl} label="Copy short link" />
      </header>

      <div className={styles.tiles}>
        <StatTile hero label="Clicks, all time" value={formatCount(link.clickCount)} />
        <StatTile label="Last 30 days" value={formatCount(lastThirtyDays)} />
        <StatTile
          label="Last click"
          value={lastClickAt ? relativeTime(lastClickAt) : 'None yet'}
          note={lastClickAt && formatDate(lastClickAt)}
        />
        <StatTile label="Created" value={formatDate(link.createdAt)} note={status} />
      </div>

      {link.clickCount === 0 ? (
        <section className={styles.empty}>
          <div>
            <h2>No clicks yet</h2>
            <p>
              Share the link or print its QR code. Visits show up here within seconds, with where
              they came from and on which kind of device.
            </p>
          </div>
          <QrCode value={link.shortUrl} code={link.code} />
        </section>
      ) : (
        <>
          <ClicksChart daily={daily} />
          <div className={styles.breakdowns}>
            <BreakdownList
              title="Top countries"
              rows={countries.map((row) => ({
                label: countryName(row.country),
                clicks: row.clicks,
              }))}
              emptyText="No country data yet."
            />
            <BreakdownList
              title="Top referrers"
              rows={referrers.map((row) => ({
                label: row.referrer ?? 'Direct or unknown',
                clicks: row.clicks,
              }))}
              emptyText="No referrers yet."
            />
            <BreakdownList
              title="Devices"
              rows={devices.map((row) => ({
                label: DEVICE_NAMES[row.device] ?? 'Other',
                clicks: row.clicks,
              }))}
              emptyText="No device data yet."
            />
          </div>
        </>
      )}
    </div>
  );
}
