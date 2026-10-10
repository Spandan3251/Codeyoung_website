export function notFound(req, res) {
  res.status(404).json({ message: 'Endpoint not found.' });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err?.name === 'ZodError') {
    return res.status(400).json({ message: err.issues[0]?.message || 'Invalid request.', code: 'VALIDATION_ERROR' });
  }

  const status = Number(err.status) || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 ? 'An unexpected server error occurred.' : err.message,
    ...(status < 500 && err.code ? { code: err.code } : {})
  });
}
