import mongoose from 'mongoose';

// Append-only record of who did what to which record. Never updated or deleted by the app.
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'restore', 'bulk_create', 'bulk_update'],
      required: true,
    },
    entity: { type: String, required: true }, // Payment | Invoice | LedgerTransaction | Student
    entityId: { type: mongoose.Schema.Types.ObjectId },
    // Only the fields that changed (update) or the full snapshot (create/delete/restore)
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },
    meta: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
    requestId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
