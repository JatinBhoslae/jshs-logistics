import dns from 'node:dns'
import mongoose from 'mongoose'
import { env } from './env.js'

export async function connectDb() {
  // Fix for querySrv EREFUSED errors in some networks (like hackathons)
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1'])
  } catch (e) {
    console.warn('Could not set DNS servers, falling back to system default.', e.message)
  }

  try {
    mongoose.set('strictQuery', true)
    await mongoose.connect(env.MONGODB_URI)
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message)
    if (error.message.includes('EREFUSED')) {
      console.error('HELP: This is a DNS issue. Try switching your internet connection or check your IP whitelist in MongoDB Atlas.')
    }
    throw error
  }
}
