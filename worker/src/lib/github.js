// The two GitHub calls behind "Sign in with GitHub": trading the one-time code for an
// access token, then reading the public profile with it. Nothing else is requested.

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const PROFILE_URL = 'https://api.github.com/user';

export function authorizeUrl({ clientId, redirectUri, state }) {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user',
    state,
    allow_signup: 'true',
  });
  return url.href;
}

export async function exchangeCode({ clientId, clientSecret, code, redirectUri }) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  // GitHub answers 200 even when the code is bad, with an `error` field in the body.
  const body = res.ok ? await res.json() : {};
  if (!body.access_token) {
    throw new Error(`GitHub token exchange failed: ${body.error ?? `HTTP ${res.status}`}`);
  }
  return body.access_token;
}

export async function fetchProfile(accessToken) {
  const res = await fetch(PROFILE_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      // GitHub rejects API requests without a User-Agent.
      'User-Agent': 'serverless-url-shortener',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub profile request failed: HTTP ${res.status}`);
  }
  const { id, login, name, avatar_url: avatarUrl } = await res.json();
  return { githubId: id, login, name: name ?? null, avatarUrl: avatarUrl ?? null };
}
