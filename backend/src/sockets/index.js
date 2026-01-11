import { verifyToken } from '../utils/jwt.js'
import { addLocationPing } from '../services/shipmentService.js'

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    const token = socket.handshake.auth?.token
    if (token) {
      try {
        const decoded = verifyToken(token)
        socket.data.userId = decoded.sub
        socket.data.role = decoded.role
      } catch {
        // ignore invalid token for hackathon demo
      }
    }

    if (socket.data.userId) {
      console.log(`[SOCKET] User ${socket.data.userId} joined room user:${socket.data.userId} (Role: ${socket.data.role})`)
      socket.join(`user:${socket.data.userId}`)
    } else {
      console.log('[SOCKET] User connected without ID (Guest?)')
    }

    socket.on('join:shipment', ({ shipmentId }) => {
      if (!shipmentId) return
      socket.join(`shipment:${shipmentId}`)
    })

    socket.on('leave:shipment', ({ shipmentId }) => {
      if (!shipmentId) return
      socket.leave(`shipment:${shipmentId}`)
    })

    // driver:locationPing -> persist + broadcast
    socket.on('driver:locationPing', async (payload, ack) => {
      try {
        if (!socket.data.userId || socket.data.role !== 'DRIVER') {
          if (ack) ack({ ok: false, error: 'Unauthorized' })
          return
        }

        const { shipmentId, lat, lng, speedKmph, heading, ts } = payload ?? {}

        const ping = await addLocationPing({
          shipmentId,
          driverId: socket.data.userId,
          lat,
          lng,
          speedKmph,
          heading,
          ts: ts ? new Date(ts) : new Date(),
        })

        io.to(`shipment:${shipmentId}`).emit('shipment:locationUpdate', {
          shipmentId,
          lat: ping.lat,
          lng: ping.lng,
          speedKmph: ping.speedKmph,
          heading: ping.heading,
          ts: ping.ts,
        })

        if (ack) ack({ ok: true })
      } catch (e) {
        if (ack) ack({ ok: false, error: e.message ?? 'Failed' })
      }
    })
  })
}
