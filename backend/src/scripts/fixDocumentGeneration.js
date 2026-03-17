#!/usr/bin/env node

/**
 * Enhanced Document Generation Script
 * 
 * This script addresses the issues with:
 * - Font rendering and alignment
 * - Dynamic document generation
 * - Proper formatting for different document types
 * - Quality control and validation
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

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

// Import models dynamically after DB connection
let Shipment, Document, User, Vehicle;

/**
 * Initialize database models
 */
async function initializeModels() {
    const models = await Promise.all([
        import('../models/Shipment.js'),
        import('../models/Document.js'),
        import('../models/User.js'),
        import('../models/Vehicle.js')
    ]);
    
    Shipment = models[0].Shipment;
    Document = models[1].Document;
    User = models[2].User;
    Vehicle = models[3].Vehicle;
}

/**
 * Document Type Configuration
 */
const DOCUMENT_TYPES = {
    DISPATCH_MANIFEST: {
        name: "Dispatch Manifest",
        description: "Pre-journey vehicle and cargo verification",
        requiredFields: ['referenceId', 'customerId', 'assignedDriverId', 'assignedVehicleId'],
        template: 'logistics_manifest'
    },
    VEHICLE_INSPECTION: {
        name: "Vehicle Inspection Report",
        description: "Comprehensive vehicle condition assessment",
        requiredFields: ['assignedVehicleId', 'referenceId'],
        template: 'inspection_report'
    },
    GST_INVOICE: {
        name: "GST Tax Invoice",
        description: "GST compliant billing document",
        requiredFields: ['referenceId', 'customerId', 'status'],
        template: 'tax_invoice'
    },
    POD: {
        name: "Proof of Delivery",
        description: "Delivery confirmation document",
        requiredFields: ['referenceId', 'status', 'consignee'],
        template: 'delivery_confirmation'
    },
    CMR_ROAD_CONSIGNMENT_NOTE: {
        name: "CMR Road Consignment Note",
        description: "International road transport document",
        requiredFields: ['referenceId', 'origin', 'destination'],
        template: 'international_consignment'
    }
};

/**
 * Font and Typography Configuration
 */
const FONT_CONFIG = {
    families: {
        primary: 'Helvetica',
        secondary: 'Helvetica-Bold',
        monospace: 'Courier'
    },
    sizes: {
        title: 18,
        header: 14,
        subheader: 12,
        body: 10,
        small: 8,
        tiny: 6
    },
    lineHeights: {
        tight: 1.1,
        normal: 1.4,
        loose: 1.8
    },
    colors: {
        primary: '#0f172a',
        secondary: '#1e293b',
        accent: '#3b82f6',
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
        muted: '#64748b',
        light: '#f8fafc',
        border: '#e2e8f0'
    }
};

/**
 * Layout Configuration
 */
const LAYOUT_CONFIG = {
    page: {
        size: 'A4',
        margins: { top: 50, right: 50, bottom: 50, left: 50 }
    },
    sections: {
        headerHeight: 120,
        footerHeight: 80,
        spacing: 20,
        columnGap: 15
    },
    alignment: {
        title: 'center',
        headers: 'left',
        data: 'left',
        numeric: 'right'
    }
};

/**
 * Validate document requirements
 */
function validateDocumentRequirements(shipment, docType) {
    const config = DOCUMENT_TYPES[docType];
    const missingFields = [];

    config.requiredFields.forEach(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], shipment);
        if (!value) {
            missingFields.push(field);
        }
    });

    return {
        isValid: missingFields.length === 0,
        missingFields,
        message: missingFields.length > 0 
            ? `Missing required fields: ${missingFields.join(', ')}`
            : 'All requirements met'
    };
}

/**
 * Enhanced document generation with proper formatting
 */
async function generateEnhancedDocument(shipment, docType, actor) {
    const validation = validateDocumentRequirements(shipment, docType);
    
    if (!validation.isValid) {
        throw new Error(`Cannot generate ${docType}: ${validation.message}`);
    }

    console.log(`📝 Generating ${DOCUMENT_TYPES[docType].name} for shipment ${shipment.referenceId}`);

    try {
        // Dynamic import to avoid circular dependencies
        const { generateEnhancedDocument: generateDoc } = await import('../services/enhancedPdfService.js');
        
        const document = await generateDoc({
            shipment,
            type: docType,
            actor,
            options: {
                title: DOCUMENT_TYPES[docType].name,
                subject: DOCUMENT_TYPES[docType].description,
                fontConfig: FONT_CONFIG,
                layoutConfig: LAYOUT_CONFIG
            }
        });

        console.log(`✅ Generated: ${document.fileName}`);
        return document;
        
    } catch (error) {
        console.error(`❌ Error generating ${docType}:`, error.message);
        throw error;
    }
}

/**
 * Quality control validation for generated documents
 */
async function validateGeneratedDocument(documentPath) {
    try {
        const stats = await fs.stat(documentPath);
        
        if (stats.size === 0) {
            throw new Error('Generated document is empty');
        }

        if (stats.size < 1000) { // Less than 1KB is suspicious
            console.warn(`⚠️  Document ${path.basename(documentPath)} is unusually small (${stats.size} bytes)`);
        }

        console.log(`🔍 Validated: ${path.basename(documentPath)} (${Math.round(stats.size / 1024)}KB)`);
        return true;
        
    } catch (error) {
        console.error(`❌ Validation failed for ${documentPath}:`, error.message);
        return false;
    }
}

/**
 * Process shipments and generate documents
 */
async function processShipments(shipments) {
    const results = {
        success: [],
        failed: [],
        skipped: []
    };

    for (const shipment of shipments) {
        try {
            console.log(`\n🚚 Processing shipment ${shipment.referenceId} (${shipment.status})`);

            // Determine which documents to generate based on shipment status
            const documentsToGenerate = [];

            if (shipment.status !== 'CREATED') {
                documentsToGenerate.push('DISPATCH_MANIFEST');
                documentsToGenerate.push('VEHICLE_INSPECTION');
            }

            if (shipment.status === 'DELIVERED' || shipment.status === 'CLOSED') {
                documentsToGenerate.push('GST_INVOICE');
                documentsToGenerate.push('POD');
            }

            if (['IN_TRANSIT', 'DELIVERED', 'CLOSED'].includes(shipment.status)) {
                documentsToGenerate.push('CMR_ROAD_CONSIGNMENT_NOTE');
            }

            // Generate documents
            for (const docType of documentsToGenerate) {
                try {
                    // Check if document already exists
                    const existingDoc = await Document.findOne({
                        shipmentId: shipment._id,
                        type: docType
                    });

                    if (existingDoc) {
                        console.log(`⏭️  Skipping ${docType} - already exists`);
                        results.skipped.push({
                            shipmentId: shipment._id,
                            documentType: docType,
                            reason: 'Already exists'
                        });
                        continue;
                    }

                    // Generate new document
                    const document = await generateEnhancedDocument(
                        shipment,
                        docType,
                        shipment.assignedDriverId || shipment.customerId
                    );

                    // Validate generated document
                    const isValid = await validateGeneratedDocument(document.absolutePath);
                    
                    if (!isValid) {
                        throw new Error('Document validation failed');
                    }

                    // Save to database
                    const docRecord = await Document.create({
                        shipmentId: shipment._id,
                        customerId: shipment.customerId?._id,
                        driverId: shipment.assignedDriverId?._id,
                        vehicleId: shipment.assignedVehicleId?._id,
                        type: docType,
                        fileName: document.fileName,
                        filePath: document.relativePath,
                        uploadedById: shipment.assignedDriverId?._id || shipment.customerId?._id,
                        verified: true,
                        verifiedAt: new Date(),
                        generatedAt: new Date()
                    });

                    results.success.push({
                        shipmentId: shipment._id,
                        documentType: docType,
                        documentId: docRecord._id,
                        fileName: document.fileName
                    });

                    console.log(`✅ Saved document record: ${docRecord._id}`);

                } catch (error) {
                    console.error(`❌ Failed to generate ${docType}:`, error.message);
                    results.failed.push({
                        shipmentId: shipment._id,
                        documentType: docType,
                        error: error.message
                    });
                }
            }

        } catch (error) {
            console.error(`❌ Failed to process shipment ${shipment.referenceId}:`, error.message);
            results.failed.push({
                shipmentId: shipment._id,
                documentType: 'ALL',
                error: error.message
            });
        }
    }

    return results;
}

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 Enhanced Document Generation Script');
    console.log('=' .repeat(50));
    
    try {
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Initialize models
        await initializeModels();
        console.log('✅ Models initialized');

        // Configuration summary
        console.log('\n📋 Configuration Summary:');
        console.log(`- Font Family: ${FONT_CONFIG.families.primary}`);
        console.log(`- Page Size: ${LAYOUT_CONFIG.page.size}`);
        console.log(`- Margins: ${JSON.stringify(LAYOUT_CONFIG.page.margins)}`);
        console.log(`- Document Types: ${Object.keys(DOCUMENT_TYPES).length}`);

        // Fetch shipments
        console.log('\n📦 Fetching shipments...');
        const shipments = await Shipment.find({})
            .populate('customerId')
            .populate('assignedDriverId')
            .populate('assignedVehicleId')
            .sort({ createdAt: -1 })
            .limit(50); // Process 50 shipments at a time

        console.log(`🚚 Found ${shipments.length} shipments to process`);

        if (shipments.length === 0) {
            console.log('ℹ️  No shipments found to process');
            return;
        }

        // Process shipments
        console.log('\n⚙️  Starting document generation...');
        const results = await processShipments(shipments);

        // Summary report
        console.log('\n📊 Generation Complete!');
        console.log('=' .repeat(50));
        console.log(`✅ Success: ${results.success.length}`);
        console.log(`⚠️  Skipped: ${results.skipped.length}`);
        console.log(`❌ Failed: ${results.failed.length}`);
        console.log(`📈 Total Processed: ${results.success.length + results.skipped.length + results.failed.length}`);

        // Detailed error report
        if (results.failed.length > 0) {
            console.log('\n❌ Failed Documents:');
            results.failed.forEach(failure => {
                console.log(`  - Shipment ${failure.shipmentId}: ${failure.documentType} - ${failure.error}`);
            });
        }

        // Database statistics
        const totalDocs = await Document.countDocuments();
        console.log(`\n📚 Total documents in database: ${totalDocs}`);

    } catch (error) {
        console.error('❌ Fatal error in main execution:', error);
        console.error(error.stack);
        process.exit(1);
    } finally {
        console.log('\n👋 Disconnecting from MongoDB...');
        await mongoose.disconnect();
        console.log('✅ Disconnected');
    }
}

// Execute script
main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});