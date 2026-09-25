import { ApiError } from './errors.js';

export const MAX_URL_LENGTH = 2048;

function invalid(message) {
  return new ApiError(400, 'invalid_url', message);
}

// Turns whatever the user typed into a clean absolute http(s) URL, or throws an ApiError
// that says what is wrong with it.
export function normalizeDestination(input, shortenerHost) {
  if (typeof input !== 'string' || input.trim() === '') {
    throw invalid('Enter a URL to shorten.');
  }
  const raw = input.trim();
  if (raw.length > MAX_URL_LENGTH) {
    throw invalid(`URLs can be at most ${MAX_URL_LENGTH} characters long.`);
  }

  const url = parseWithDefaultScheme(raw);
  if (!url) {
    throw invalid("That doesn't look like a web address.");
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw invalid('Only http and https links can be shortened.');
  }
  if (!url.hostname.includes('.')) {
    throw invalid('Use a full web address, like example.com/page.');
  }
  // "https://paypal.com@evil.example" reads like PayPal but opens evil.example.
  if (url.username || url.password) {
    throw invalid('Links with a username or password in them are not allowed.');
  }
  if (url.hostname === shortenerHost) {
    throw invalid('That is already a short link.');
  }
  return url.href;
}

// People often paste "example.com/page" without a scheme. Only an explicit "scheme://"
// counts as one, because the URL parser would read "example.com:8080" as the scheme
// "example.com:".
function parseWithDefaultScheme(raw) {
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  return URL.parse(withScheme);
}
