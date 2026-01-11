import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 4000),
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,

  // Routing (hackathon demo)
  // Default uses public OSRM endpoint. If rate-limited, UI will fall back to straight line.
  ROUTING_PROVIDER: process.env.ROUTING_PROVIDER ?? 'osrm',
  ROUTING_URL: process.env.ROUTING_URL ?? 'https://router.project-osrm.org',

  // Driver analytics heuristics
  SPEED_LIMIT_KMPH: Number(process.env.SPEED_LIMIT_KMPH ?? 80),
  HARSH_TURN_DEG: Number(process.env.HARSH_TURN_DEG ?? 60),
  HARSH_TURN_WINDOW_SEC: Number(process.env.HARSH_TURN_WINDOW_SEC ?? 20),
  IDLE_WINDOW_SEC: Number(process.env.IDLE_WINDOW_SEC ?? 180),
  DRIVER_EVENT_COOLDOWN_SEC: Number(process.env.DRIVER_EVENT_COOLDOWN_SEC ?? 300),

  // External APIs
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_ACCOUNT_NUMBER: process.env.RAZORPAY_ACCOUNT_NUMBER || '2323230041626980',

  // Twilio for OTP
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  // Prefer explicit FROM number; fall back to TWILIO_PHONE_NUMBER if that's what is set
  TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER,
  TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID,

  // Mail
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || '"JSHS Logistics" <no-reply@jshslogistics.com>',
}

if (!process.env.MONGODB_URI) {
  // eslint-disable-next-line no-console
  console.warn('MONGODB_URI not set; using local mongodb://127.0.0.1:27017/nextgen_logistics')
}

if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('JWT_SECRET not set; using dev-secret')
}
