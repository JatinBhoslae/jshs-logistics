import { verifyToken } from '../utils/jwt.js'
import { User } from '../models/User.js'

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: { message: 'Missing auth token' } })
  }

  try {
    const decoded = verifyToken(token)
    const user = await User.findById(decoded.sub).lean()

    if (!user) {
      return res.status(401).json({ error: { message: 'User not found' } })
    }

    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: { message: 'Invalid token' } })
  }
}
