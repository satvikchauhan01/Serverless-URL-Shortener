import { useId, useState } from 'react';
import { SHORT_HOST, updateLink } from '../api/endpoints.js';
import { expiryFromChoice } from '../lib/expiry.js';
import { displayUrl } from '../lib/format.js';
import { checkUrl } from '../lib/validation.js';
import { Button } from './Button.jsx';
import { Dialog } from './Dialog.jsx';
import { ExpiryPicker } from './ExpiryPicker.jsx';
import styles from './EditLinkDialog.module.css';

const FIELD_FOR_ERROR = { invalid_url: 'url', invalid_expiry: 'expiry' };

// The expiry picker works with local calendar dates, so an existing expiry is shown as
// the day it falls on.
function initialExpiry(link) {
  if (!link.expiresAt || link.expired) return { choice: 'never', date: '' };
  const date = new Date(link.expiresAt);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    choice: 'custom',
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
  };
}

export function EditLinkDialog({ link, onClose, onSaved }) {
  const urlId = useId();
  const [url, setUrl] = useState(link.longUrl);
  const [expiry, setExpiry] = useState(() => initialExpiry(link));
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function save(event) {
    event.preventDefault();
    const checked = checkUrl(url, SHORT_HOST);
    const expiresAt = expiryTouched ? expiryFromChoice(expiry.choice, expiry.date) : {};
    if (checked.error || expiresAt.error) {
      setErrors({ url: checked.error, expiry: expiresAt.error });
      return;
    }

    // Only what changed is sent, so an untouched expiry is never re-rounded to a day.
    const changes = {};
    if (checked.url !== link.longUrl) changes.url = checked.url;
    if (expiryTouched) changes.expiresAt = expiresAt.value;
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      onSaved(await updateLink(link.code, changes));
    } catch (err) {
      setErrors({ [FIELD_FOR_ERROR[err.code] ?? 'form']: err.message });
      setSaving(false);
    }
  }

  return (
    <Dialog title={`Edit ${link.code}`} onClose={onClose}>
      <form className={styles.form} onSubmit={save} noValidate>
        <div className={styles.field}>
          <label htmlFor={urlId}>Destination</label>
          <input
            id={urlId}
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-invalid={Boolean(errors.url)}
          />
          <p className={errors.url ? styles.error : styles.hint}>
            {errors.url ??
              `Currently ${displayUrl(link.longUrl)}. Visitors follow the new one straight away.`}
          </p>
        </div>

        <ExpiryPicker
          value={expiry}
          onChange={(next) => {
            setExpiry(next);
            setExpiryTouched(true);
          }}
          error={errors.expiry}
        />

        {errors.form && (
          <p className={styles.error} role="alert">
            {errors.form}
          </p>
        )}

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" busy={saving} disabled={saving}>
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
