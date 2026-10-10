// Errors that are safe to show to the client. Anything else becomes a generic 500.
export class AppError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}
export class ValidationError extends AppError {
  constructor(message) { super(message, 400, 'VALIDATION_ERROR'); }
}
export class NotFoundError extends AppError {
  constructor(message) { super(message, 404, 'NOT_FOUND'); }
}
export class ConflictError extends AppError {
  constructor(message, code = 'CONFLICT') { super(message, 409, code); }
}
