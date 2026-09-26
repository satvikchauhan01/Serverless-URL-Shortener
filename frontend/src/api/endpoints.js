import { apiUrl, request } from './client.js';

// Short links are served by the same Worker as the API, so they share its host.
export const SHORT_HOST = new URL(apiUrl('/')).host;

export const SIGN_IN_URL = apiUrl('/api/auth/github');

export function createLink(fields) {
  return request('/api/links', { method: 'POST', body: fields });
}

export function checkAlias(alias, signal) {
  return request(`/api/links/availability?alias=${encodeURIComponent(alias)}`, { signal });
}

export function listLinks({ search = '', cursor } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return request(`/api/links${query ? `?${query}` : ''}`);
}

export function getLinkStats(code) {
  return request(`/api/links/${encodeURIComponent(code)}/stats`);
}

export function updateLink(code, fields) {
  return request(`/api/links/${encodeURIComponent(code)}`, { method: 'PATCH', body: fields });
}

export function deleteLink(code) {
  return request(`/api/links/${encodeURIComponent(code)}`, { method: 'DELETE' });
}

export function getMe() {
  return request('/api/me');
}
