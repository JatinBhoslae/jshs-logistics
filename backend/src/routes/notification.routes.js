import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { listNotifications, markRead, resolveNotification, getUnreadNotifications } from '../controllers/notificationController.js'

export const notificationRouter = Router()

notificationRouter.use(requireAuth)
notificationRouter.get('/', asyncHandler(listNotifications))
notificationRouter.get('/unread', asyncHandler(getUnreadNotifications))
notificationRouter.patch('/:id/read', asyncHandler(markRead))
notificationRouter.post('/:id/resolve', asyncHandler(resolveNotification))
