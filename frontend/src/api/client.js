const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'hop.session';

// Fired when the API rejects the stored token, so the session can be cleared app-wide.
export const SESSION_EXPIRED_EVENT = 'hop:session-expired';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function apiUrl(path) {
  return `${API_URL}${path}`;
}

// localStorage can throw (private windows, blocked storage); the app then simply behaves
// as signed out.
export function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Nothing to do: the session just won't survive a reload.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Same as above.
  }
}

export async function request(path, { method = 'GET', body, signal } = {}) {
  const token = readToken();
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(apiUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(
      0,
      'network',
      "Can't reach the server. Check your connection and try again.",
    );
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (response.ok) return data;

  if (response.status === 401 && token) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  throw new ApiError(
    response.status,
    data?.error?.code ?? 'unknown',
    data?.error?.message ?? 'Something went wrong. Try again in a moment.',
  );
}
