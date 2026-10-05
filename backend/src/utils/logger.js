import pino from 'pino';

// Structured JSON logs to stdout (captured by the host, e.g. Vercel). Secrets are redacted.
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: ['req.headers.authorization', 'req.headers.cookie', 'password', 'body.password'],
});

export default logger;
