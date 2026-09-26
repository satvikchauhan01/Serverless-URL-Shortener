import { useId } from 'react';
import { EXPIRY_PRESETS, tomorrowAsDateInput } from '../lib/expiry.js';
import styles from './ExpiryPicker.module.css';

// value: { choice: one of EXPIRY_PRESETS ids, date: 'YYYY-MM-DD' for a picked date }
export function ExpiryPicker({ value, onChange, error }) {
  const name = useId();
  const dateId = useId();
  const errorId = useId();

  return (
    <fieldset className={styles.fieldset} aria-describedby={error ? errorId : undefined}>
      <legend className={styles.legend}>Expires</legend>
      <div className={styles.segments}>
        {EXPIRY_PRESETS.map((preset) => (
          <label key={preset.id} className={styles.segment}>
            <input
              type="radio"
              name={name}
              value={preset.id}
              checked={value.choice === preset.id}
              onChange={() => onChange({ ...value, choice: preset.id })}
            />
            <span>{preset.label}</span>
          </label>
        ))}
      </div>

      {value.choice === 'custom' && (
        <div className={styles.dateRow}>
          <label htmlFor={dateId}>Last day the link works</label>
          <input
            id={dateId}
            type="date"
            min={tomorrowAsDateInput()}
            value={value.date}
            onChange={(event) => onChange({ ...value, date: event.target.value })}
          />
        </div>
      )}

      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </fieldset>
  );
}
