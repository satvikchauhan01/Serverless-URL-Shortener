import { Link } from 'react-router';
import { displayUrl, formatCount, formatDate, relativeTime } from '../lib/format.js';
import { CopyButton } from './CopyButton.jsx';
import { ChartIcon, PencilIcon, QrIcon, TrashIcon } from './Icons.jsx';
import styles from './LinkRow.module.css';

export function LinkRow({ link, onShowQr, onEdit, onDelete }) {
  return (
    <li className={styles.row}>
      <div className={styles.identity}>
        <Link to={`/links/${link.code}`} className={styles.code}>
          {link.code}
        </Link>
        {link.expired && <span className={styles.expired}>Expired</span>}
        <p className={styles.destination} title={link.longUrl}>
          {displayUrl(link.longUrl)}
        </p>
        <p className={styles.meta}>
          Created {relativeTime(link.createdAt)}
          {link.expiresAt &&
            ` · ${link.expired ? 'expired' : 'expires'} ${formatDate(link.expiresAt)}`}
        </p>
      </div>

      <p className={styles.clicks}>
        <strong>{formatCount(link.clickCount)}</strong> {link.clickCount === 1 ? 'click' : 'clicks'}
      </p>

      <div className={styles.actions}>
        <CopyButton value={link.shortUrl} size="sm" variant="ghost" />
        <IconAction
          title="QR code"
          label={`QR code for ${link.code}`}
          onClick={() => onShowQr(link)}
        >
          <QrIcon />
        </IconAction>
        <Link
          to={`/links/${link.code}`}
          className={styles.iconAction}
          aria-label={`Stats for ${link.code}`}
          title="Stats"
        >
          <ChartIcon />
        </Link>
        <IconAction title="Edit" label={`Edit ${link.code}`} onClick={() => onEdit(link)}>
          <PencilIcon />
        </IconAction>
        <IconAction
          title="Delete"
          label={`Delete ${link.code}`}
          onClick={() => onDelete(link)}
          danger
        >
          <TrashIcon />
        </IconAction>
      </div>
    </li>
  );
}

function IconAction({ title, label, onClick, danger = false, children }) {
  return (
    <button
      type="button"
      className={danger ? `${styles.iconAction} ${styles.danger}` : styles.iconAction}
      onClick={onClick}
      aria-label={label}
      title={title}
    >
      {children}
    </button>
  );
}
