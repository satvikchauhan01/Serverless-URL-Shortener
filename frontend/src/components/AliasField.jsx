import { useEffect, useId, useState } from 'react';
import { checkAlias, SHORT_HOST } from '../api/endpoints.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { aliasError } from '../lib/validation.js';
import styles from './AliasField.module.css';

const REASONS = {
  taken: 'Someone already uses this one.',
  reserved: 'This word is reserved. Try another.',
  invalid: 'Only letters, numbers, dashes and underscores.',
};

// Optional custom alias, checked against the API once typing pauses.
export function AliasField({ value, onChange, serverError }) {
  const id = useId();
  const statusId = useId();
  const alias = value.trim();
  const settled = useDebouncedValue(alias, 350);
  const [result, setResult] = useState(null);
  const formatError = alias ? aliasError(alias) : null;

  useEffect(() => {
    if (!settled || aliasError(settled)) return undefined;
    // A newer keystroke cancels the older request, so answers never arrive out of order.
    const controller = new AbortController();
    checkAlias(settled, controller.signal)
      .then((answer) => setResult(answer))
      .catch((err) => err.name !== 'AbortError' && setResult({ alias: settled, error: true }));
    return () => controller.abort();
  }, [settled]);

  const current = result?.alias === alias ? result : null;
  let status = { tone: 'muted', text: 'Leave empty for a random code.' };
  if (serverError) status = { tone: 'bad', text: serverError };
  else if (formatError) status = { tone: 'bad', text: formatError };
  else if (alias && !current) status = { tone: 'muted', text: 'Checking…' };
  else if (current?.error) status = { tone: 'muted', text: "Couldn't check right now." };
  else if (current?.available) status = { tone: 'good', text: 'Available.' };
  else if (current) status = { tone: 'bad', text: REASONS[current.reason] };

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        Alias <span className={styles.optional}>optional</span>
      </label>
      <div className={styles.input} data-tone={alias ? status.tone : undefined}>
        <span className={styles.prefix} aria-hidden="true">
          <span className={styles.host}>{SHORT_HOST}</span>/
        </span>
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="my-link"
          autoComplete="off"
          spellCheck="false"
          maxLength={32}
          aria-describedby={statusId}
          aria-invalid={status.tone === 'bad'}
        />
      </div>
      <p id={statusId} className={styles.status} data-tone={status.tone} aria-live="polite">
        {status.text}
      </p>
    </div>
  );
}
