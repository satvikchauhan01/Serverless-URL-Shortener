import { ApiError } from './errors.js';

export async function readJsonObject(c) {
  let body;
  try {
    body = await c.req.json();
  } catch {
    throw new ApiError(400, 'invalid_json', 'The request body is not valid JSON.');
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'invalid_json', 'The request body must be a JSON object.');
  }
  return body;
}
