// Errors the API returns on purpose. Anything else that escapes a handler is a bug and
// becomes a generic 500.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(c, status, code, message) {
  return c.json({ error: { code, message } }, status);
}

export function handleError(err, c) {
  if (err instanceof ApiError) {
    return errorResponse(c, err.status, err.code, err.message);
  }
  console.error(err);
  return errorResponse(c, 500, 'internal', 'Something went wrong on our side.');
}

export function handleNotFound(c) {
  return errorResponse(c, 404, 'not_found', 'There is nothing here.');
}
