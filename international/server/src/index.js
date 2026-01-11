import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'node:dns';

// Fix for querySrv EREFUSED errors (common in restricted networks)
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    console.warn('⚠️ Could not set custom DNS servers:', e.message);
}

// Fix: Point to the backend's .env file since root doesn't have one
dotenv.config({ path: path.resolve(process.cwd(), '../../backend/.env') });

const app = express();
const PORT = process.env.INTERNATIONAL_PORT || 5001;

import quotesRouter from './routes/quotes.js';
import authRouter from './routes/auth.js';

app.use(cors());
app.use(express.json());

app.use('/api/quotes', quotesRouter);
app.use('/api/auth', authRouter);

// Basic Health Check

app.get('/', (req, res) => {
    res.json({ status: 'active', module: 'International Logistics', version: '1.0.0' });
});

// Connect to MongoDB (Reusing existing connection string but potentially new logic)
console.log('🔌 Connecting to MongoDB...');
// Use standard URI or strictly fallback to local if defined, but warn.
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.warn('⚠️  MONGODB_URI is not defined in .env! Attempting localhost fallback...');
} else {
    console.log('✅ Found MONGODB_URI in environment.');
}

// Fallback to the same DB name as backend if local
let CONNECTION_STRING = MONGO_URI || 'mongodb://127.0.0.1:27017/nextgen_logistics';

// Hotfix: Force IPv4 if localhost is used to avoid ECONNREFUSED ::1
if (CONNECTION_STRING.includes('localhost')) {
    console.log('🔧 Replacing "localhost" with "127.0.0.1" to force IPv4...');
    CONNECTION_STRING = CONNECTION_STRING.replace('localhost', '127.0.0.1');
}

mongoose.connect(CONNECTION_STRING)
    .then(() => console.log('✅ International Module connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        // Don't kill process, just log
    });

app.listen(PORT, () => {
    console.log(`🚀 International Server running on http://localhost:${PORT}`);
});
