export function requireRole(...roles) {
  const allowedRoles = [...roles.flat(), 'ADMIN'] // Always allow ADMIN
  return function roleGuard(req, res, next) {
    const role = req.user?.role
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: { message: 'Forbidden' } })
    }
    next()
  }
}
