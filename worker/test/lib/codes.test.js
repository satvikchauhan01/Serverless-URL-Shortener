import { afterEach, describe, expect, it, vi } from 'vitest';
import { aliasProblem, CODE_LENGTH, CODE_PATTERN, generateCode } from '../../src/lib/codes.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateCode', () => {
  it('returns base62 codes of the default length', () => {
    expect(generateCode()).toMatch(new RegExp(`^[0-9A-Za-z]{${CODE_LENGTH}}$`));
  });

  it('does not repeat itself across many draws', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateCode()));
    expect(codes.size).toBe(1000);
  });

  it('throws away bytes that would bias the alphabet', () => {
    // Served three bytes per draw: 255 and 248 are skipped, 0 is "0", 61 is "z", 1 is "1".
    const bytes = [255, 0, 248, 61, 1, 9];
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      array.set(bytes.splice(0, array.length));
      return array;
    });

    expect(generateCode(3)).toBe('0z1');
  });
});

describe('CODE_PATTERN', () => {
  it.each(['abc', 'x7Kp2Qa', 'my-resume', 'launch_2026', 'a'.repeat(32)])('accepts %s', (code) => {
    expect(CODE_PATTERN.test(code)).toBe(true);
  });

  it.each(['ab', 'a'.repeat(33), 'wp-login.php', 'has space', 'ünïcode', ''])(
    'rejects %j',
    (code) => {
      expect(CODE_PATTERN.test(code)).toBe(false);
    },
  );
});

describe('aliasProblem', () => {
  it.each(['my-resume', 'Launch_2026', 'abc'])('has no problem with %s', (alias) => {
    expect(aliasProblem(alias)).toBeNull();
  });

  it.each(['ab', 'has space', 'a'.repeat(33), 'wp-login.php', 42, null])(
    'calls %j invalid',
    (alias) => {
      expect(aliasProblem(alias)).toBe('invalid');
    },
  );

  it.each(['api', 'Dashboard', 'LOGIN', 'cdn-cgi'])('calls %s reserved', (alias) => {
    expect(aliasProblem(alias)).toBe('reserved');
  });
});
