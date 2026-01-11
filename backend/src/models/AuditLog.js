import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    metadata: { type: Object },
  },
  { timestamps: true }
)

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
