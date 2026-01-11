import { Notification } from '../models/Notification.js'

export async function listNotifications(req, res) {
  // Base query: notifications explicitly addressed to this userId
  const query = { userId: req.user._id }

  // Extra safety: when a notification was created with a specific roleTargeted,
  // make sure we only return rows matching the currently logged-in role.
  // Generic notifications (no roleTargeted) are still shown.
  if (['CUSTOMER', 'DRIVER', 'MANAGER'].includes(req.user.role)) {
    Object.assign(query, {
      $or: [
        { 'metadata.roleTargeted': req.user.role },
        { 'metadata.roleTargeted': { $exists: false } },
      ],
    })
  }

  const rows = await Notification.find(query).sort({ createdAt: -1 }).lean()
  res.json({ notifications: rows })
}

export async function markRead(req, res) {
  const n = await Notification.findOne({ _id: req.params.id, userId: req.user._id })
  if (!n) return res.status(404).json({ error: { message: 'Notification not found' } })

  n.readAt = new Date()
  await n.save()
  res.json({ notification: n })
}

export async function resolveNotification(req, res) {
  try {
    const { resolveIotAlert } = await import('../services/iotService.js')
    const n = await resolveIotAlert(req.params.id, req.user._id)
    res.json({ notification: n })
  } catch (error) {
    res.status(400).json({ error: { message: error.message } })
  }
}

export async function getUnreadNotifications(req, res) {
  const query = { userId: req.user._id, readAt: { $exists: false } }

  if (['CUSTOMER', 'DRIVER', 'MANAGER'].includes(req.user.role)) {
    Object.assign(query, {
      $or: [
        { 'metadata.roleTargeted': req.user.role },
        { 'metadata.roleTargeted': { $exists: false } },
      ],
    })
  }

  if (req.query.importance) {
    query.importance = req.query.importance;
  }

  const rows = await Notification.find(query).sort({ createdAt: -1 }).lean()
  res.json({ notifications: rows })
}
