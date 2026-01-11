import { AuditLog } from '../models/AuditLog.js'

export async function audit({ actorId, action, entityType, entityId, metadata }) {
  return AuditLog.create({
    actorId,
    action,
    entityType,
    entityId: String(entityId),
    metadata,
  })
}
