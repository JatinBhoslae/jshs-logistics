import http from 'http'
import { Server } from 'socket.io'

import app from './app.js'
import { env } from './config/env.js'
import { connectDb } from './config/db.js'
import { runDbMigrations } from './config/dbMigrations.js'
import { registerSocketHandlers } from './sockets/index.js'
import { setIO } from './sockets/io.js'
import { startScheduler } from './services/schedulerService.js'

await connectDb()
await runDbMigrations()

startScheduler()

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (origin === env.CORS_ORIGIN) return callback(null, origin)
      if (/^http:\/\/[a-z0-9-]+\.localhost:5173$/.test(origin)) return callback(null, origin)
      if (origin.endsWith('.jshsl.app') || origin.endsWith('.jshs.app')) return callback(null, origin)
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  },
})

setIO(io)
registerSocketHandlers(io)

server.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${env.PORT}`)
})
