import { useEffect, useState } from 'react';
import { Button } from './Button.jsx';
import { CheckIcon, CopyIcon } from './Icons.jsx';

const LABELS = { idle: 'Copy', copied: 'Copied', failed: 'Press Ctrl+C to copy' };

export function CopyButton({ value, size = 'md', variant = 'secondary', label = 'Copy' }) {
  const [state, setState] = useState('idle');

  useEffect(() => {
    if (state === 'idle') return undefined;
    const timer = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <Button size={size} variant={variant} onClick={copy}>
      {state === 'copied' ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite">{state === 'idle' ? label : LABELS[state]}</span>
    </Button>
  );
}
