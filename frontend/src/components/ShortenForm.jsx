import { useId, useRef, useState } from 'react';
import { createLink, SHORT_HOST, SIGN_IN_URL } from '../api/endpoints.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { expiryFromChoice } from '../lib/expiry.js';
import { displayUrl } from '../lib/format.js';
import { checkUrl } from '../lib/validation.js';
import { AliasField } from './AliasField.jsx';
import { Button } from './Button.jsx';
import { ExpiryPicker } from './ExpiryPicker.jsx';
import styles from './ShortenForm.module.css';

// Which field an API error belongs to; anything else is shown above the button.
const FIELD_FOR_ERROR = {
  invalid_url: 'url',
  invalid_alias: 'alias',
  alias_reserved: 'alias',
  alias_taken: 'alias',
  invalid_expiry: 'expiry',
};

export function ShortenForm({ signedIn, onCreated }) {
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiry, setExpiry] = useState({ choice: 'never', date: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const urlInput = useRef(null);
  const ids = { url: useId(), urlHint: useId(), form: useId() };

  // Feedback appears once typing pauses or the field loses focus, not on every keystroke.
  const settledUrl = useDebouncedValue(url, 450);
  const liveCheck =
    url.trim() && (blurred || settledUrl === url) ? checkUrl(url, SHORT_HOST) : null;
  const urlError = errors.url ?? liveCheck?.error;

  async function handleSubmit(event) {
    event.preventDefault();
    const checked = checkUrl(url, SHORT_HOST);
    const expiresAt = signedIn ? expiryFromChoice(expiry.choice, expiry.date) : { value: null };
    if (checked.error || expiresAt.error) {
      setErrors({ url: checked.error, expiry: expiresAt.error });
      if (checked.error) urlInput.current.focus();
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const fields = { url: checked.url };
      if (signedIn && alias.trim()) fields.alias = alias.trim();
      if (signedIn && expiresAt.value) fields.expiresAt = expiresAt.value;
      onCreated(await createLink(fields));
    } catch (err) {
      setErrors({ [FIELD_FOR_ERROR[err.code] ?? 'form']: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-describedby={ids.form}>
      <label htmlFor={ids.url} className={styles.label}>
        Long URL
      </label>
      <div className={styles.bar} data-invalid={Boolean(urlError) || undefined}>
        <input
          ref={urlInput}
          id={ids.url}
          className={styles.urlInput}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck="false"
          placeholder="https://example.com/a/very/long/link"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setBlurred(false);
            setErrors((current) => ({ ...current, url: undefined }));
          }}
          onBlur={() => setBlurred(true)}
          aria-invalid={Boolean(urlError)}
          aria-describedby={ids.urlHint}
          autoFocus
        />
        <Button type="submit" variant="primary" busy={submitting} disabled={submitting}>
          {submitting ? 'Shortening…' : 'Shorten'}
        </Button>
      </div>
      <p id={ids.urlHint} className={urlError ? styles.error : styles.hint} aria-live="polite">
        {urlError ??
          (liveCheck?.url
            ? `Will send people to ${displayUrl(liveCheck.url)}`
            : 'Paste any http or https address.')}
      </p>

      {signedIn ? (
        <div className={styles.options}>
          <AliasField value={alias} onChange={setAlias} serverError={errors.alias} />
          <ExpiryPicker value={expiry} onChange={setExpiry} error={errors.expiry} />
        </div>
      ) : (
        <p className={styles.guestNote}>
          No account needed: links made as a guest work for 7 days.{' '}
          <a href={SIGN_IN_URL}>Sign in with GitHub</a> to choose the alias, set your own expiry and
          see who clicks.
        </p>
      )}

      <p id={ids.form} className={styles.formError} role="alert">
        {errors.form}
      </p>
    </form>
  );
}
