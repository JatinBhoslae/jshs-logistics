/**
 * API Route to regenerate all documents
 * DELETE /api/documents/regenerate
 */
import { Document } from '../models/Document.js';
import { Shipment } from '../models/Shipment.js';
import { Invoice } from '../models/Invoice.js';
import { generateShipmentPdf } from '../services/pdfService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

export async function regenerateAllDocuments(req, res) {
    try {
        console.log('🗑️  Starting fresh: Comprehensive Document Wipe & Regeneration...');

        // Step 1: Delete all existing documents and invoices from DB
        const deletedDocs = await Document.deleteMany({});
        const deletedInvoices = await Invoice.deleteMany({});
        console.log(`🗑️  Deleted ${deletedDocs.deletedCount} documents and ${deletedInvoices.deletedCount} invoices from database`);

        // Step 2: Delete all files in uploads directory (except .gitkeep)
        let deletedFiles = 0;
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
                if (file !== '.gitkeep' && file.startsWith('gen_')) {
                    try {
                        fs.unlinkSync(path.join(uploadsDir, file));
                        deletedFiles++;
                    } catch (err) {
                        console.error(`Failed to delete ${file}:`, err.message);
                    }
                }
            }
        }
        console.log(`🗑️  Deleted ${deletedFiles} files from uploads directory`);

        // Step 3: Find all shipments and regenerate their documents
        const shipments = await Shipment.find({})
            .populate('customerId')
            .populate('assignedDriverId')
            .populate('assignedVehicleId');

        console.log(`📦 Found ${shipments.length} shipments. Regenerating premium paperwork...`);

        let regeneratedCount = 0;
        const errors = [];

        for (const shipment of shipments) {
            try {
                // Determine which documents to generate based on shipment lifecycle
                const typesToGen = ['DISPATCH_MANIFEST', 'VEHICLE_INSPECTION'];

                if (['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CLOSED'].includes(shipment.status)) {
                    typesToGen.push('CMR_ROAD_CONSIGNMENT_NOTE');
                }

                if (['DELIVERED', 'CLOSED'].includes(shipment.status)) {
                    typesToGen.push('POD');
                    typesToGen.push('GST_INVOICE');
                }

                for (const type of typesToGen) {
                    try {
                        const options = {};
                        if (type === 'GST_INVOICE') {
                            // Professional Password Policy: {RefFirst4}{CustomerNameFirst4}
                            const refPrefix = (shipment.referenceId || 'JSHS').slice(0, 4);
                            const namePrefix = (shipment.customerId?.legalName || shipment.customerId?.name || 'VALU').slice(0, 4);
                            options.password = `${refPrefix}${namePrefix}`.toUpperCase();
                        }

                        const pdfRes = await generateShipmentPdf({
                            shipment,
                            type,
                            actor: req.user,
                            options
                        });

                        await Document.create({
                            shipmentId: shipment._id,
                            customerId: shipment.customerId?._id,
                            driverId: shipment.assignedDriverId?._id,
                            vehicleId: shipment.assignedVehicleId?._id,
                            type,
                            fileName: pdfRes.fileName,
                            filePath: pdfRes.relativePath,
                            uploadedById: req.user._id,
                            verified: true,
                            verifiedAt: new Date(),
                            verifiedById: req.user._id
                        });

                        if (type === 'GST_INVOICE') {
                            // Also ensure an Invoice record exists if it was deleted
                            await Invoice.findOneAndUpdate(
                                { shipmentId: shipment._id },
                                {
                                    customerId: shipment.customerId?._id,
                                    shipmentId: shipment._id,
                                    amount: shipment.price || 0,
                                    status: shipment.status === 'CLOSED' ? 'PAID' : 'ISSUED',
                                    dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                },
                                { upsert: true }
                            );
                        }

                        regeneratedCount++;
                    } catch (typeErr) {
                        errors.push(`Shipment ${shipment.referenceId} - ${type}: ${typeErr.message}`);
                    }
                }

                console.log(`  ✓ Premium regeneration complete for ${shipment.referenceId}`);
            } catch (error) {
                const errorMsg = `Critical failure for shipment ${shipment.referenceId}: ${error.message}`;
                errors.push(errorMsg);
            }
        }

        res.json({
            success: true,
            message: `Successfully regenerated ${regeneratedCount} premium documents`,
            stats: {
                deletedDocuments: deletedDocs.deletedCount,
                deletedFiles,
                shipmentsProcessed: shipments.length,
                totalRegenerated: regeneratedCount,
                errors: errors.length
            },
            errors: errors.length > 20 ? errors.slice(0, 20).concat(['...more']) : errors
        });

    } catch (error) {
        console.error('❌ Regeneration Failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
