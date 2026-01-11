import twilio from 'twilio'
import { env } from '../config/env.js'

let client = null

function getClient() {
  if (!client) {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio is not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN')
    }
    client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  }
  return client
}

export async function sendOtpSms({ to, body }) {
  const c = getClient()

  const hasMessagingService = !!env.TWILIO_MESSAGING_SERVICE_SID
  const hasFromNumber = !!env.TWILIO_FROM_NUMBER

  if (!hasMessagingService && !hasFromNumber) {
    throw new Error('Twilio sender is not configured. Set TWILIO_FROM_NUMBER or TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID')
  }

  const payload = hasMessagingService
    ? { messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID, to, body }
    : { from: env.TWILIO_FROM_NUMBER, to, body }

  return c.messages.create(payload)
}
