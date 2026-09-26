// The same rules the Worker applies (worker/src/lib/urls.js and codes.js), so most
// mistakes show up while typing. The Worker still has the final say.

const MAX_URL_LENGTH = 2048;
const ALIAS_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

// Returns { url } with the cleaned-up address, or { error } with what to fix.
export function checkUrl(input, shortenerHost) {
  const raw = input.trim();
  if (raw === '') return { error: 'Enter a URL to shorten.' };
  if (raw.length > MAX_URL_LENGTH) {
    return { error: `URLs can be at most ${MAX_URL_LENGTH} characters long.` };
  }

  const url = parse(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (!url) return { error: "That doesn't look like a web address." };
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: 'Only http and https links can be shortened.' };
  }
  if (!url.hostname.includes('.')) {
    return { error: 'Use a full web address, like example.com/page.' };
  }
  if (url.username || url.password) {
    return { error: 'Links with a username or password in them are not allowed.' };
  }
  if (url.host === shortenerHost) return { error: 'That is already a short link.' };
  return { url: url.href };
}

export function aliasError(alias) {
  if (ALIAS_PATTERN.test(alias)) return null;
  if (alias.length < 3) return 'At least 3 characters.';
  if (alias.length > 32) return 'At most 32 characters.';
  return 'Only letters, numbers, dashes and underscores.';
}

// URL.parse is still missing from some browsers people use.
function parse(text) {
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

// A last check before any stored URL becomes an href. The API only stores http(s) URLs,
// but nothing that could run script should ever reach a link.
export function isWebUrl(value) {
  return /^https?:\/\//i.test(value);
}
