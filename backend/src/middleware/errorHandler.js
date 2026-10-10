import logger from '../utils/logger.js';

/**
 * Custom error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  // MongoDB duplicate key error — handled before logging to avoid stderr noise
  if (Number(err.code) === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  // Invalid ObjectId / bad cast -> 400 instead of 500
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path || 'value'}` });
  }

  // Mongoose validation errors -> 400 with readable message
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: Object.values(err.errors).map((e) => e.message).join(', '),
    });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const isServerError = statusCode >= 500;

  // 5xx: full error with stack for debugging; 4xx: just a warning line (expected client errors)
  const ctx = { requestId: req.id, userId: req.user?._id, method: req.method, url: req.originalUrl, statusCode };
  if (isServerError) logger.error({ ...ctx, err }, err.message);
  else logger.warn(ctx, err.message);

  res.status(statusCode).json({
    success: false,
    message: isServerError && process.env.NODE_ENV !== 'development' ? 'Internal server error' : err.message,
    // app-defined machine-readable codes (e.g. PASSWORD_CHANGE_REQUIRED); skips driver/system codes
    ...(typeof err.code === 'string' && /^[A-Z_]+$/.test(err.code) && !isServerError && { code: err.code }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Handle 404 errors
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
