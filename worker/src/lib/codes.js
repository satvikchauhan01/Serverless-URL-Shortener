const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// 256 is not a multiple of 62, so `byte % 62` would favour the first eight characters.
// Bytes from 248 (4 × 62) upwards are thrown away instead.
const UNBIASED_BYTE_LIMIT = 248;

export const CODE_LENGTH = 7;

// Every short code matches this, whether it was generated or picked by a user.
export const CODE_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

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
