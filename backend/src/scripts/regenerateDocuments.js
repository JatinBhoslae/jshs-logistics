import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Document } from '../models/Document.js';
import { Shipment } from '../models/Shipment.js';
import { generateShipmentPdf } from '../services/pdfService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend directory
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI not found in environment variables');
    console.error('Tried loading from:', envPath);
    process.exit(1);
}

const uploadsDir = path.join(__dirname, '../../uploads');

async function regenerateDocuments() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Step 1: Delete all existing documents from DB
        const deletedCount = await Document.deleteMany({});
        console.log(`🗑️  Deleted ${deletedCount.deletedCount} existing documents from database`);

        // Step 2: Delete all files in uploads directory (except .gitkeep)
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            let deletedFiles = 0;
            for (const file of files) {
                if (file !== '.gitkeep') {
                    fs.unlinkSync(path.join(uploadsDir, file));
                    deletedFiles++;
                }
            }
            console.log(`🗑️  Deleted ${deletedFiles} files from uploads directory`);
        }

        // Step 3: Find all shipments and regenerate their documents
        const shipments = await Shipment.find({})
            .populate('customerId')
            .populate('assignedDriverId')
            .populate('assignedVehicleId');

        console.log(`📦 Found ${shipments.length} shipments. Regenerating documents...`);

        let regeneratedCount = 0;

        for (const shipment of shipments) {
            try {
                // Generate Dispatch Manifest for all shipments
                if (shipment.status !== 'CREATED') {
                    const manifestPdf = await generateShipmentPdf({
                        shipment,
                        type: 'DISPATCH_MANIFEST',
                        actor: shipment.assignedDriverId || shipment.customerId
                    });

                    await Document.create({
                        shipmentId: shipment._id,
                        customerId: shipment.customerId?._id,
                        driverId: shipment.assignedDriverId?._id,
                        vehicleId: shipment.assignedVehicleId?._id,
                        type: 'DISPATCH_MANIFEST',
                        fileName: manifestPdf.fileName,
                        filePath: manifestPdf.relativePath,
                        uploadedById: shipment.assignedDriverId?._id,
                        verified: true,
                        verifiedAt: new Date()
                    });
                    regeneratedCount++;
                }

                // Generate Invoice for delivered shipments
                if (shipment.status === 'DELIVERED' || shipment.status === 'CLOSED') {
                    const invoicePdf = await generateShipmentPdf({
                        shipment,
                        type: 'GST_INVOICE',
                        actor: shipment.customerId,
                        options: {
                            password: `${shipment.referenceId.slice(0, 4)}${(shipment.customerId?.legalName || shipment.customerId?.name || '').slice(0, 4)}`
                        }
                    });

                    await Document.create({
                        shipmentId: shipment._id,
                        customerId: shipment.customerId?._id,
                        type: 'GST_INVOICE',
                        fileName: invoicePdf.fileName,
                        filePath: invoicePdf.relativePath,
                        uploadedById: shipment.customerId?._id,
                        verified: true,
                        verifiedAt: new Date()
                    });
                    regeneratedCount++;
                }

                // Generate Vehicle Inspection Report
                if (shipment.assignedVehicleId && shipment.status !== 'CREATED') {
                    const inspectionPdf = await generateShipmentPdf({
                        shipment,
                        type: 'VEHICLE_INSPECTION',
                        actor: shipment.assignedDriverId
                    });

                    await Document.create({
                        shipmentId: shipment._id,
                        driverId: shipment.assignedDriverId?._id,
                        vehicleId: shipment.assignedVehicleId?._id,
                        type: 'VEHICLE_INSPECTION',
                        fileName: inspectionPdf.fileName,
                        filePath: inspectionPdf.relativePath,
                        uploadedById: shipment.assignedDriverId?._id,
                        verified: true,
                        verifiedAt: new Date()
                    });
                    regeneratedCount++;
                }

                // Generate CMR Road Consignment Note for in-transit shipments
                if (shipment.status === 'IN_TRANSIT' || shipment.status === 'DELIVERED' || shipment.status === 'CLOSED') {
                    const cmrPdf = await generateShipmentPdf({
                        shipment,
                        type: 'CMR_ROAD_CONSIGNMENT_NOTE',
                        actor: shipment.assignedDriverId
                    });

                    await Document.create({
                        shipmentId: shipment._id,
                        customerId: shipment.customerId?._id,
                        driverId: shipment.assignedDriverId?._id,
                        vehicleId: shipment.assignedVehicleId?._id,
                        type: 'CMR_ROAD_CONSIGNMENT_NOTE',
                        fileName: cmrPdf.fileName,
                        filePath: cmrPdf.relativePath,
                        uploadedById: shipment.assignedDriverId?._id,
                        verified: true,
                        verifiedAt: new Date()
                    });
                    regeneratedCount++;
                }

                console.log(`  ✓ Regenerated documents for shipment ${shipment.referenceId}`);
            } catch (error) {
                console.error(`  ✗ Failed to regenerate documents for shipment ${shipment.referenceId}:`, error.message);
            }
        }

        console.log(`\n✅ Successfully regenerated ${regeneratedCount} documents`);
        console.log(`📊 Total documents in database: ${await Document.countDocuments()}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

regenerateDocuments();
