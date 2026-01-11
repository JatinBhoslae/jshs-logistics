import { AuditLog } from '../models/AuditLog.js'

export async function getAuditLogs(req, res) {
    // Only managers can view all audit logs.

    const limit = parseInt(req.query.limit) || 50

    const logs = await AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('actorId', 'name email role')
        .lean()

    res.json({ logs })
}
