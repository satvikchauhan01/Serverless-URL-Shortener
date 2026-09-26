const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// 256 is not a multiple of 62, so `byte % 62` would favour the first eight characters.
// Bytes from 248 (4 × 62) upwards are thrown away instead.
const UNBIASED_BYTE_LIMIT = 248;

export const CODE_LENGTH = 7;

// Every short code matches this, whether it was generated or picked by a user.
export const CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

// Paths the app uses or is likely to need, plus Cloudflare's own /cdn-cgi/ prefix.
const RESERVED_ALIASES = new Set([
  'about',
  'account',
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'cdn-cgi',
  'dashboard',
  'docs',
  'health',
  'help',
  'links',
  'login',
  'logout',
  'privacy',
  'settings',
  'signin',
  'signup',
  'static',
  'stats',
  'status',
  'terms',
  'www',
]);

export function generateCode(length = CODE_LENGTH) {
  let code = '';
  while (code.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < UNBIASED_BYTE_LIMIT && code.length < length) {
        code += ALPHABET[byte % ALPHABET.length];
      }
    }
  }
  return code;
}

// Says why an alias can't be used ('invalid' or 'reserved'), or returns null when it is
// fine. Whether someone already took it is a question for the database.
export function aliasProblem(alias) {
  if (typeof alias !== 'string' || !CODE_PATTERN.test(alias)) return 'invalid';
  if (RESERVED_ALIASES.has(alias.toLowerCase())) return 'reserved';
  return null;
}
