import AuditLog from '../models/AuditLog.js';
import logger from './logger.js';

const SKIP_FIELDS = new Set(['password', 'refreshToken', '__v', 'updatedAt', 'createdAt']);

// Plain, JSON-safe copy of a mongoose doc / object without secrets or noise
export const snapshot = (doc) => {
  if (!doc) return undefined;
  const obj = JSON.parse(JSON.stringify(typeof doc.toObject === 'function' ? doc.toObject() : doc));
  SKIP_FIELDS.forEach((f) => delete obj[f]);
  return obj;
};

// Returns { before, after } containing only keys whose value differs
export const diffSnapshots = (beforeDoc, afterDoc) => {
  const before = snapshot(beforeDoc) || {};
  const after = snapshot(afterDoc) || {};
  const b = {};
  const a = {};
  new Set([...Object.keys(before), ...Object.keys(after)]).forEach((key) => {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      b[key] = before[key];
      a[key] = after[key];
    }
  });
  return { before: b, after: a };
};

/**
 * Record an audit entry. Never throws: a logging failure must not break the user's request.
 * @param {object} req Express request (provides actor, ip, request id)
 * @param {object} entry { action, entity, entityId, before, after, meta }
 */
export const logAudit = async (req, { action, entity, entityId, before, after, meta }) => {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      action,
      entity,
      entityId,
      before,
      after,
      meta,
      ip: req.ip,
      requestId: req.id ? String(req.id) : undefined,
    });
  } catch (err) {
    logger.error({ err, entity, entityId, action }, 'Failed to write audit log');
  }
};
