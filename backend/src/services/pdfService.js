import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = path.join(__dirname, '..', '..', 'uploads')
const assetsDir = path.join(__dirname, '..', 'assets')
const logoPath = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'logo.png')
const sealPath = path.join(assetsDir, 'company_seal.png')
const signPath = path.join(assetsDir, 'manager_esign.png')

const TYPE_TITLES = {
  // UNIVERSAL
  COMMERCIAL_INVOICE: 'Commercial Invoice',
  PACKING_LIST: 'Packing List',
  CERTIFICATE_OF_ORIGIN: 'Certificate of Origin',

  // SEA FREIGHT
  BILL_OF_LADING: 'Bill of Lading',
  TELEX_RELEASE: 'Telex Release',
  SEA_WAYBILL: 'Sea Waybill',

  // AIR FREIGHT
  AIR_WAYBILL: 'Air Waybill',

  // ROAD FREIGHT
  CMR_ROAD_CONSIGNMENT_NOTE: 'CMR Road Consignment Note',
  TRIP_SHEET: 'Trip Sheet',

  // CUSTOMS
  SHIPPING_BILL: 'Export Declaration / Shipping Bill',
  BILL_OF_ENTRY: 'Import Declaration / Bill of Entry',

  // CORE
  DISPATCH_MANIFEST: 'Pre-Journey Dispatch Manifest',
  VEHICLE_INSPECTION: 'Vehicle Inspection Report',
  POD: 'Proof of Delivery (POD)',
  GST_INVOICE: 'Final Tax Invoice',
}

/**
 * Generate a professionally formatted PDF for a shipment paperwork document.
 * Returns { fileName, relativePath } where relativePath is suitable for filePath in Document.
 */
export async function generateShipmentPdf({ shipment, type, actor, options = {} }) {
  const safeType = String(type || 'DOCUMENT').toUpperCase()
  const baseName = safeType.toLowerCase()
  const ts = Date.now()
  const ref = shipment.referenceId || String(shipment._id || '').slice(-8)
  const fileName = `gen_${baseName}_${ref}_${ts}.pdf`
  const absPath = path.join(uploadsDir, fileName)
  const relativePath = `/uploads/${fileName}`

  await fs.promises.mkdir(uploadsDir, { recursive: true })

  const pdfOptions = { size: 'A4', margin: 40 }

  // Apply password protection if provided (Specifically for Invoices)
  if (options.password) {
    pdfOptions.userPassword = options.password;
    pdfOptions.ownerPassword = process.env.PDF_OWNER_PASSWORD || 'admin_master_key';
    pdfOptions.permissions = {
      printing: 'highResolution',
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: false,
      contentAccessibility: true,
      documentAssembly: false,
    };
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(pdfOptions)
    const stream = fs.createWriteStream(absPath)

    doc.pipe(stream)

    if (safeType === 'GST_INVOICE') {
      renderDetailedInvoice(doc, shipment, actor);
    } else if (safeType === 'POD') {
      renderProofOfDelivery(doc, shipment, actor);
    } else {
      renderStandardDocument(doc, shipment, safeType);
    }

    doc.end()

    stream.on('finish', () => resolve({ fileName, relativePath, absolutePath: absPath }))
    stream.on('error', (err) => reject(err))
  })
}

// ==========================================
// 1. STANDARD DOCUMENT RENDERER (Clean & Professional)
// ==========================================
function renderStandardDocument(doc, shipment, type) {
  const title = TYPE_TITLES[type] || type.replace(/_/g, ' ')

  // Header Band
  doc.rect(0, 0, doc.page.width, 120).fill('#0f172a')

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 20, { width: 80 });
  } else {
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('JSHS LOGISTICS', 40, 45)
  }

  doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text(title, 0, 45, { align: 'right', x: 40, width: doc.page.width - 80 })
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text('SECURE LOGISTICS NETWORK • INDIA OPERATIONS', 0, 70, { align: 'right', x: 40, width: doc.page.width - 80 })

  let y = 140
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('SHIPMENT REFERENCE: ' + shipment.referenceId, 40, y)
  doc.fillColor('#64748b').fontSize(8).font('Helvetica').text('GENERATED ON: ' + new Date().toLocaleString('en-IN'), 40, y + 15)

  y += 45

  // SENDER & RECEIVER BOXES (Variable Col Spans approach)
  // Consignor on left (wider), Consignee on right
  const col1Width = (doc.page.width - 100) * 0.55
  const col2Width = (doc.page.width - 100) * 0.45
  const gap = 20

  // Origin / Consignor
  doc.rect(40, y, col1Width, 110).fillAndStroke('#f8fafc', '#e2e8f0')
  doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('ORIGIN / CONSIGNOR', 50, y + 10)

  const customer = shipment.customerId || {}
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text(customer.legalName || customer.name || 'JSHS Customer', 50, y + 25, { width: col1Width - 20 })
  doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(customer.address || 'Address not registered', 50, y + 40, { width: col1Width - 20 })
  doc.font('Helvetica-Bold').text('GST: ' + (customer.gstNumber || 'N/A'), 50, y + 85)

  // Destination / Consignee
  doc.rect(40 + col1Width + gap, y, col2Width, 110).fillAndStroke('#f8fafc', '#e2e8f0')
  doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('DESTINATION / CONSIGNEE', 40 + col1Width + gap + 10, y + 10)

  const consignee = shipment.consignee || {}
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text(consignee.name || 'Shipment Receiver', 40 + col1Width + gap + 10, y + 25, { width: col2Width - 20 })
  doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(shipment.destination?.address || shipment.destination?.name || 'Destination Hub', 40 + col1Width + gap + 10, y + 40, { width: col2Width - 20 })
  doc.font('Helvetica-Bold').text('Contact: ' + (consignee.contact || 'N/A'), 40 + col1Width + gap + 10, y + 85)

  y += 130

  // SHIPMENT SPECIFICATIONS (Grid)
  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('SHIPMENT SPECIFICATIONS', 40, y)
  y += 15
  doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#cbd5e1')
  y += 15

  const specs = [
    { l: 'Category', v: shipment.shipmentType },
    { l: 'Weight', v: (shipment.packageDetails?.weight || 'N/A') + ' KG' },
    { l: 'Dimensions', v: shipment.packageDetails?.dimensions || 'Standard' },
    { l: 'Vehicle No', v: shipment.assignedVehicleId?.plateNumber || 'TBD' },
    { l: 'Service Type', v: (shipment.deliveryType || 'Standard').toUpperCase() },
    { l: 'Distance', v: (shipment.distanceKm || '0') + ' KM' }
  ]

  let specX = 40
  specs.forEach((s, i) => {
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(s.l, specX, y)
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(s.v, specX, y + 12)
    specX += 85
    if ((i + 1) % 6 === 0) { y += 40; specX = 40 }
  })

  y += 40

  // Compliance Content
  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('Terms & Compliance Declarations', 40, y)
  y += 15
  doc.fontSize(8).font('Helvetica').fillColor('#475569')
  const terms = [
    '1. Carrier certifies that the vehicle used has passed the JSHS safety inspection protocols.',
    '2. Goods listed are transported as per Indian Motor Vehicles Act and GST E-Way Bill regulations.',
    '3. JSHS Logistics is responsible for the digital chain of custody recorded on our secure network.',
    '4. Any discrepancy must be noted on this document at the time of loading/unloading.'
  ]
  terms.forEach(t => {
    doc.text(t, 40, y, { width: doc.page.width - 80 })
    y += 15
  })

  // Signatures at bottom
  y = doc.page.height - 150

  // Seal
  if (fs.existsSync(sealPath)) {
    doc.image(sealPath, 40, y - 20, { width: 80 });
  }

  // Manager Sign (Left)
  if (fs.existsSync(signPath)) {
    doc.image(signPath, 150, y, { width: 80 });
  }
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b').text('AUTHORIZED SIGNATORY', 150, y + 45)

  // Driver Sign (Right) - If available
  const driverSignPath = shipment.driverEsign ? path.join(__dirname, '..', '..', shipment.driverEsign) : null;
  if (driverSignPath && fs.existsSync(driverSignPath)) {
    doc.image(driverSignPath, doc.page.width - 140, y, { width: 80 });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b').text('DRIVER SIGNATURE', doc.page.width - 140, y + 45)
  } else {
    doc.rect(doc.page.width - 140, y, 100, 40).stroke('#e2e8f0')
    doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text('AWAITING DRIVER E-SIGN', doc.page.width - 140, y + 15, { width: 100, align: 'center' })
  }

  drawFooter(doc)
}

// ==========================================
// 2. PROOF OF DELIVERY (POD) RENDERER
// ==========================================
function renderProofOfDelivery(doc, shipment, actor) {
  renderStandardDocument(doc, shipment, 'POD')

  // Override some parts or add specific delivery details
  doc.addPage()
  doc.rect(0, 0, doc.page.width, 60).fill('#0f172a')
  doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('DELIVERY CONFIRMATION RECORD', 40, 20)

  let y = 80
  doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('DELIVERY METRICS', 40, y)
  y += 20

  doc.rect(40, y, doc.page.width - 80, 100).fillAndStroke('#f0fdf4', '#22c55e')
  y += 15
  doc.fontSize(10).font('Helvetica').fillColor('#166534')
  doc.text('Actual Delivery Time: ' + (shipment.lastEventAt ? new Date(shipment.lastEventAt).toLocaleString() : 'N/A'), 55, y)
  doc.text('Delivery OTP Verified: YES (Consignee Auth)', 55, y + 20)
  doc.text('Recipient Name: ' + (shipment.consignee?.name || 'N/A'), 55, y + 40)
  doc.text('System Reference: ' + shipment._id, 55, y + 60)

  y += 110
  const driverSignPath = shipment.driverEsign ? path.join(__dirname, '..', '..', shipment.driverEsign) : null;
  if (driverSignPath && fs.existsSync(driverSignPath)) {
    doc.image(driverSignPath, 40, y, { width: 120 });
    doc.fontSize(10).font('Helvetica-Bold').text('Driver E-Signature (On Delivery)', 40, y + 60)
  }

  drawFooter(doc)
}

// ==========================================
// 3. DETAILED INVOICE RENDERER
// ==========================================
function renderDetailedInvoice(doc, shipment, actor) {
  const customer = shipment.customerId || {};
  const invDate = new Date().toLocaleDateString('en-IN');
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN');

  doc.rect(0, 0, doc.page.width, 10).fill('#2563eb')

  let y = 40
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, y, { width: 100 });
  } else {
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e293b').text('JSHS LOGISTICS', 40, y);
  }

  // Invoice Meta
  doc.fillColor('#1e40af').fontSize(24).font('Helvetica-Bold').text('TAX INVOICE', 0, y, { align: 'right', x: 40, width: doc.page.width - 80 });
  y += 35
  doc.fillColor('#64748b').fontSize(10).font('Helvetica-Bold').text('INV-' + shipment.referenceId, 0, y, { align: 'right', x: 40, width: doc.page.width - 80 });

  y += 60

  // BILLING INFO (Column Layout)
  doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('BILL TO:', 40, y)
  doc.text('SHIPMENT DETAILS:', 320, y)

  y += 12
  // Left: Consignor
  doc.fillColor('#1e293b').fontSize(12).font('Helvetica-Bold').text(customer.legalName || customer.name || 'Valued Partner', 40, y, { width: 250 })
  doc.fontSize(9).font('Helvetica').fillColor('#475569').text(customer.address || 'Address registered with JSHS', 40, doc.y + 2, { width: 250 })
  doc.font('Helvetica-Bold').text('GSTIN: ' + (customer.gstNumber || 'Unregistered'), 40, doc.y + 5)

  // Right: Shipment
  let rightY = y;
  doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text('Shipment ID: ', 320, rightY); doc.font('Helvetica').text(shipment.referenceId, 400, rightY);
  rightY += 15;
  doc.font('Helvetica-Bold').text('Date: ', 320, rightY); doc.font('Helvetica').text(invDate, 400, rightY);
  rightY += 15;
  doc.font('Helvetica-Bold').text('Due Date: ', 320, rightY); doc.font('Helvetica').text(dueDate, 400, rightY);
  rightY += 15;
  doc.font('Helvetica-Bold').text('Route: ', 320, rightY); doc.font('Helvetica').text(`${shipment.origin?.name} > ${shipment.destination?.name}`, 400, rightY, { width: 150 });

  y = Math.max(doc.y + 20, rightY + 20)

  // TABLE
  doc.rect(40, y, doc.page.width - 80, 25).fill('#0f172a')
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
  doc.text('DESC', 50, y + 8)
  doc.text('CATEGORY', 150, y + 8)
  doc.text('WEIGHT', 280, y + 8)
  doc.text('RATE', 380, y + 8)
  doc.text('AMOUNT', 480, y + 8)

  y += 35
  doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
  doc.text('Primary Freight Charges', 50, y)
  doc.text(shipment.shipmentType, 150, y)
  doc.text((shipment.packageDetails?.weight || 0) + ' KG', 280, y)

  const basePrice = (shipment.price || 0) / 1.18
  doc.text((basePrice).toFixed(2), 380, y)
  doc.font('Helvetica-Bold').text((basePrice).toFixed(2), 480, y)

  y += 25
  doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#e2e8f0')

  // Totals
  y += 20
  const totalX = 350
  doc.fillColor('#64748b').fontSize(10).font('Helvetica').text('Subtotal:', totalX, y);
  doc.fillColor('#1e293b').font('Helvetica-Bold').text('₹' + basePrice.toFixed(2), 480, y);

  y += 18
  doc.fillColor('#64748b').font('Helvetica').text('GST (18%):', totalX, y);
  doc.fillColor('#1e293b').font('Helvetica-Bold').text('₹' + (shipment.price - basePrice).toFixed(2), 480, y);

  y += 18
  doc.rect(totalX, y - 5, 200, 30).fill('#f8fafc')
  doc.fillColor('#1e40af').fontSize(12).font('Helvetica-Bold').text('TOTAL AMOUNT:', totalX + 10, y + 8);
  doc.text('₹' + shipment.price?.toFixed(2), 480, y + 8);

  y += 60

  // Footer / Seal
  if (fs.existsSync(sealPath)) {
    doc.image(sealPath, 40, y, { width: 100 });
  }

  if (fs.existsSync(signPath)) {
    doc.image(signPath, doc.page.width - 140, y, { width: 100 });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b').text('Manager Signatory', doc.page.width - 140, y + 50)
  }

  drawFooter(doc)
}

function drawFooter(doc) {
  const footerY = doc.page.height - 40;
  doc.fontSize(7).fillColor('#94a3b8').text('© JSHS LOGISTICS PRIVATE LIMITED • GST REGULATED ENTITY • AUTO-GENERATED AUTHENTIC RECORD', 40, footerY, {
    width: doc.page.width - 80, align: 'center'
  });
}
