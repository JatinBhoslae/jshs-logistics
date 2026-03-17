#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { regenerateEnhancedDocuments } from '../services/enhancedPdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI not found in environment variables');
    console.error('Tried loading from:', envPath);
    process.exit(1);
}

async function main() {
    try {
        console.log('🚀 Starting Enhanced Document Generation Script');
        console.log('📡 Connecting to MongoDB...');
        
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n📄 Starting enhanced document regeneration...');
        await regenerateEnhancedDocuments();

        console.log('\n✅ Document generation completed successfully!');
        
    } catch (error) {
        console.error('❌ Error in document generation script:', error);
        console.error(error.stack);
        process.exit(1);
    } finally {
        console.log('👋 Disconnecting from MongoDB...');
        await mongoose.disconnect();
        console.log('✅ Disconnected');
    }
}

// Run the script
main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});