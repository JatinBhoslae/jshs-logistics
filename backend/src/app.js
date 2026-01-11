import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'

import { env } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { apiRouter } from './routes/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true)

      // In development, allow ALL localhost ports and IPs and subdomains
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('http://192.168.') ||
        origin.match(/^http:\/\/[a-z0-9-]+\.localhost:\d+$/)
      ) {
        return callback(null, true)
      }

      // Allow production domains
      if (
        origin.endsWith('.jshsl.app') || 
        origin.endsWith('.jshs.app') ||
        origin.endsWith('.onrender.com')
      ) {
        return callback(null, origin)
      }

      // Fallback: If specific origin matches env
      if (origin === env.CORS_ORIGIN) return callback(null, true)

      console.error('CORS Blocked Origin:', origin)
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/health', (req, res) => res.json({ ok: true }))

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

app.use('/api', apiRouter)

app.use(errorHandler)

export default app
