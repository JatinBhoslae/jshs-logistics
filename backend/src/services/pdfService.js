import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "..", "..", "uploads");
const assetsDir = path.join(__dirname, "..", "assets");
const logoPath = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "frontend",
  "public",
  "logo.png",
);
const sealPath = path.join(assetsDir, "company_seal.png");
const signPath = path.join(assetsDir, "manager_esign.png");

const TYPE_TITLES = {
  // UNIVERSAL
  COMMERCIAL_INVOICE: "Commercial Invoice",
  PACKING_LIST: "Packing List",
  CERTIFICATE_OF_ORIGIN: "Certificate of Origin",

  // SEA FREIGHT
  BILL_OF_LADING: "Bill of Lading",
  TELEX_RELEASE: "Telex Release",
  SEA_WAYBILL: "Sea Waybill",

  // AIR FREIGHT
  AIR_WAYBILL: "Air Waybill",

  // ROAD FREIGHT
  CMR_ROAD_CONSIGNMENT_NOTE: "CMR Road Consignment Note",
  TRIP_SHEET: "Trip Sheet",

  // CUSTOMS
  SHIPPING_BILL: "Export Declaration / Shipping Bill",
  BILL_OF_ENTRY: "Import Declaration / Bill of Entry",

  // CORE
  DISPATCH_MANIFEST: "Pre-Journey Dispatch Manifest",
  VEHICLE_INSPECTION: "Vehicle Inspection Report",
  POD: "Proof of Delivery (POD)",
  GST_INVOICE: "Final Tax Invoice",
};

/**
 * Generate a professionally formatted PDF for a shipment paperwork document.
 * Returns { fileName, relativePath } where relativePath is suitable for filePath in Document.
 */
export async function generateShipmentPdf({
  shipment,
  type,
  actor,
  options = {},
}) {
  const safeType = String(type || "DOCUMENT").toUpperCase();
  const baseName = safeType.toLowerCase();
  const ts = Date.now();
  const ref = shipment.referenceId || String(shipment._id || "").slice(-8);
  const fileName = `gen_${baseName}_${ref}_${ts}.pdf`;
  const absPath = path.join(uploadsDir, fileName);
  const relativePath = `/uploads/${fileName}`;

  await fs.promises.mkdir(uploadsDir, { recursive: true });

  const pdfOptions = { size: "A4", margin: 40 };

  // Apply password protection if provided (Specifically for Invoices)
  if (options.password) {
    pdfOptions.userPassword = options.password;
    pdfOptions.ownerPassword =
      process.env.PDF_OWNER_PASSWORD || "admin_master_key";
    pdfOptions.permissions = {
      printing: "highResolution",
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: false,
      contentAccessibility: true,
      documentAssembly: false,
    };
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument(pdfOptions);
    const stream = fs.createWriteStream(absPath);

    doc.pipe(stream);

    if (safeType === "GST_INVOICE") {
      renderDetailedInvoice(doc, shipment, actor);
    } else if (safeType === "POD") {
      renderProofOfDelivery(doc, shipment, actor);
    } else if (safeType === "DISPATCH_MANIFEST") {
      renderDispatchManifest(doc, shipment, actor);
    } else if (safeType === "VEHICLE_INSPECTION") {
      renderVehicleInspection(doc, shipment, actor);
    } else if (safeType === "E_WAY_BILL") {
      renderEWayBill(doc, shipment, actor);
    } else if (safeType === "CONSIGNMENT_NOTE") {
      renderConsignmentNote(doc, shipment, actor);
    } else {
      renderStandardDocument(doc, shipment, safeType);
    }

    doc.end();

    stream.on("finish", () =>
      resolve({ fileName, relativePath, absolutePath: absPath }),
    );
    stream.on("error", (err) => reject(err));
  });
}

// ==========================================
// 1. STANDARD DOCUMENT RENDERER (Clean & Professional)
// ==========================================
function renderStandardDocument(doc, shipment, type) {
  const title = TYPE_TITLES[type] || type.replace(/_/g, " ");

  // Header Band
  doc.rect(0, 0, doc.page.width, 120).fill("#0f172a");

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 20, { width: 80 });
  } else {
    doc
      .fillColor("#ffffff")
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("JSHS LOGISTICS", 40, 45);
  }

  doc
    .fillColor("#ffffff")
    .fontSize(16)
    .font("Helvetica-Bold")
    .text(title, 0, 45, { align: "right", x: 40, width: doc.page.width - 80 });
  doc
    .fillColor("#94a3b8")
    .fontSize(8)
    .font("Helvetica")
    .text("SECURE LOGISTICS NETWORK • INDIA OPERATIONS", 0, 70, {
      align: "right",
      x: 40,
      width: doc.page.width - 80,
    });

  let y = 140;
  doc
    .fillColor("#0f172a")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("SHIPMENT REFERENCE: " + shipment.referenceId, 40, y);
  doc
    .fillColor("#64748b")
    .fontSize(8)
    .font("Helvetica")
    .text("GENERATED ON: " + new Date().toLocaleString("en-IN"), 40, y + 15);

  y += 45;

  // SENDER & RECEIVER BOXES (Variable Col Spans approach)
  // Consignor on left (wider), Consignee on right
  const col1Width = (doc.page.width - 100) * 0.55;
  const col2Width = (doc.page.width - 100) * 0.45;
  const gap = 20;

  // Origin / Consignor
  doc.rect(40, y, col1Width, 110).fillAndStroke("#f8fafc", "#e2e8f0");
  doc
    .fillColor("#0f172a")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("ORIGIN / CONSIGNOR", 50, y + 10);

  const customer = shipment.customerId || {};
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#1e293b")
    .text(customer.legalName || customer.name || "JSHS Customer", 50, y + 25, {
      width: col1Width - 20,
    });
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#64748b")
    .text(customer.address || "Address not registered", 50, y + 40, {
      width: col1Width - 20,
    });
  doc
    .font("Helvetica-Bold")
    .text("GST: " + (customer.gstNumber || "N/A"), 50, y + 85);

  // Destination / Consignee
  doc
    .rect(40 + col1Width + gap, y, col2Width, 110)
    .fillAndStroke("#f8fafc", "#e2e8f0");
  doc
    .fillColor("#0f172a")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("DESTINATION / CONSIGNEE", 40 + col1Width + gap + 10, y + 10);

  const consignee = shipment.consignee || {};
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#1e293b")
    .text(
      consignee.name || "Shipment Receiver",
      40 + col1Width + gap + 10,
      y + 25,
      { width: col2Width - 20 },
    );
  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#64748b")
    .text(
      shipment.destination?.address ||
        shipment.destination?.name ||
        "Destination Hub",
      40 + col1Width + gap + 10,
      y + 40,
      { width: col2Width - 20 },
    );
  doc
    .font("Helvetica-Bold")
    .text(
      "Contact: " + (consignee.contact || "N/A"),
      40 + col1Width + gap + 10,
      y + 85,
    );

  y += 130;

  // SHIPMENT SPECIFICATIONS (Grid)
  doc
    .fillColor("#0f172a")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("SHIPMENT SPECIFICATIONS", 40, y);
  y += 15;
  doc
    .moveTo(40, y)
    .lineTo(doc.page.width - 40, y)
    .stroke("#cbd5e1");
  y += 15;

  const specs = [
    { l: "Category", v: shipment.shipmentType },
    { l: "Weight", v: (shipment.packageDetails?.weight || "N/A") + " KG" },
    { l: "Dimensions", v: shipment.packageDetails?.dimensions || "Standard" },
    { l: "Vehicle No", v: shipment.assignedVehicleId?.plateNumber || "TBD" },
    {
      l: "Service Type",
      v: (shipment.deliveryType || "Standard").toUpperCase(),
    },
    { l: "Distance", v: (shipment.distanceKm || "0") + " KM" },
  ];

  let specX = 40;
  specs.forEach((s, i) => {
    doc.fillColor("#64748b").fontSize(8).font("Helvetica").text(s.l, specX, y);
    doc
      .fillColor("#0f172a")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(s.v, specX, y + 12);
    specX += 85;
    if ((i + 1) % 6 === 0) {
      y += 40;
      specX = 40;
    }
  });

  y += 40;

  // Compliance Content
  doc
    .fillColor("#0f172a")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Terms & Compliance Declarations", 40, y);
  y += 15;
  doc.fontSize(8).font("Helvetica").fillColor("#475569");
  const terms = [
    "1. Carrier certifies that the vehicle used has passed the JSHS safety inspection protocols.",
    "2. Goods listed are transported as per Indian Motor Vehicles Act and GST E-Way Bill regulations.",
    "3. JSHS Logistics is responsible for the digital chain of custody recorded on our secure network.",
    "4. Any discrepancy must be noted on this document at the time of loading/unloading.",
  ];
  terms.forEach((t) => {
    doc.text(t, 40, y, { width: doc.page.width - 80 });
    y += 15;
  });

  // Signatures at bottom
  y = doc.page.height - 150;

  // Seal
  if (fs.existsSync(sealPath)) {
    doc.image(sealPath, 40, y - 20, { width: 80 });
  }

  // Manager Sign (Left)
  if (fs.existsSync(signPath)) {
    doc.image(signPath, 150, y, { width: 80 });
  }
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor("#1e293b")
    .text("AUTHORIZED SIGNATORY", 150, y + 45);

  // Driver Sign (Right) - If available
  const driverSignPath = shipment.driverEsign
    ? path.join(__dirname, "..", "..", shipment.driverEsign)
    : null;
  if (driverSignPath && fs.existsSync(driverSignPath)) {
    doc.image(driverSignPath, doc.page.width - 140, y, { width: 80 });
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor("#1e293b")
      .text("DRIVER SIGNATURE", doc.page.width - 140, y + 45);
  } else {
    doc.rect(doc.page.width - 140, y, 100, 40).stroke("#e2e8f0");
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#94a3b8")
      .text("AWAITING DRIVER E-SIGN", doc.page.width - 140, y + 15, {
        width: 100,
        align: "center",
      });
  }

  drawFooter(doc);
}

// ==========================================
// 2. PROOF OF DELIVERY (POD) RENDERER
// ==========================================
function renderProofOfDelivery(doc, shipment, actor) {
  renderStandardDocument(doc, shipment, "POD");

  // Override some parts or add specific delivery details
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 60).fill("#0f172a");
  doc
    .fillColor("#ffffff")
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("DELIVERY CONFIRMATION RECORD", 40, 20);

  let y = 80;
  doc
    .fillColor("#0f172a")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("DELIVERY METRICS", 40, y);
  y += 20;

  doc.rect(40, y, doc.page.width - 80, 100).fillAndStroke("#f0fdf4", "#22c55e");
  y += 15;
  doc.fontSize(10).font("Helvetica").fillColor("#166534");
  doc.text(
    "Actual Delivery Time: " +
      (shipment.lastEventAt
        ? new Date(shipment.lastEventAt).toLocaleString()
        : "N/A"),
    55,
    y,
  );
  doc.text("Delivery OTP Verified: YES (Consignee Auth)", 55, y + 20);
  doc.text(
    "Recipient Name: " + (shipment.consignee?.name || "N/A"),
    55,
    y + 40,
  );
  doc.text("System Reference: " + shipment._id, 55, y + 60);

  y += 110;
  const driverSignPath = shipment.driverEsign
    ? path.join(__dirname, "..", "..", shipment.driverEsign)
    : null;
  if (driverSignPath && fs.existsSync(driverSignPath)) {
    doc.image(driverSignPath, 40, y, { width: 120 });
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Driver E-Signature (On Delivery)", 40, y + 60);
  }

  drawFooter(doc);
}

// ==========================================
// 3. DETAILED INVOICE RENDERER
// ==========================================
function renderDetailedInvoice(doc, shipment, actor) {
  const customer = shipment.customerId || {};
  const invDate = new Date().toLocaleDateString("en-IN");
  const dueDate = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toLocaleDateString("en-IN");

  doc.rect(0, 0, doc.page.width, 15).fill("#1e40af");

  let y = 45;
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, y, { width: 100 });
  } else {
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor("#1e293b")
      .text("JSHS LOGISTICS", 40, y);
  }

  // Invoice Meta
  doc
    .fillColor("#1e40af")
    .fontSize(28)
    .font("Helvetica-Bold")
    .text("TAX INVOICE", 0, y, {
      align: "right",
      x: 40,
      width: doc.page.width - 80,
    });
  y += 35;
  doc
    .fillColor("#64748b")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("INV/JSHS/" + shipment.referenceId, 0, y, {
      align: "right",
      x: 40,
      width: doc.page.width - 80,
    });

  y += 70;

  // SENDER & BILLING INFO
  const col1 = 40;
  const col2 = 320;

  doc
    .fillColor("#1e40af")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("FROM:", col1, y);
  doc.text("BILL TO:", col2, y);

  y += 15;
  // Left: JSHS Details
  doc
    .fillColor("#1e293b")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("JSHS LOGISTICS PVT LTD", col1, y);
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#475569")
    .text("Sector 12, Hiranandani Estate,", col1, y + 15)
    .text("Thane, Maharashtra - 400607", col1, y + 27)
    .text("GSTIN: 27AAACG1234A1Z1", col1, y + 39)
    .text("Email: accounts@jshslogistics.com", col1, y + 51);

  // Right: Customer Details
  doc
    .fillColor("#1e293b")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(customer.legalName || customer.name || "Valued Partner", col2, y);
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#475569")
    .text(customer.address || "Address registered with JSHS", col2, y + 15, {
      width: 230,
    })
    .text("GSTIN: " + (customer.gstNumber || "Unregistered"), col2, doc.y + 5);

  y += 80;

  // SHIPMENT SUMMARY BOX
  doc
    .rect(40, y, doc.page.width - 80, 40)
    .fill("#f8fafc")
    .stroke("#e2e8f0");
  doc
    .fillColor("#1e293b")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("SHIPMENT REF", 50, y + 10);
  doc.text("DATE", 150, y + 10);
  doc.text("DUE DATE", 250, y + 10);
  doc.text("ROUTE", 350, y + 10);

  doc.font("Helvetica").text(shipment.referenceId, 50, y + 25);
  doc.text(invDate, 150, y + 25);
  doc.text(dueDate, 250, y + 25);
  doc.text(
    `${shipment.origin?.name} → ${shipment.destination?.name}`,
    350,
    y + 25,
    { width: 180 },
  );

  y += 60;

  // ITEMS TABLE
  doc.rect(40, y, doc.page.width - 80, 25).fill("#1e293b");
  doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
  doc.text("DESCRIPTION", 50, y + 8);
  doc.text("SAC CODE", 200, y + 8);
  doc.text("QTY", 280, y + 8);
  doc.text("RATE", 350, y + 8);
  doc.text("TAXABLE AMT", 450, y + 8);

  y += 35;
  doc.fillColor("#1e293b").fontSize(10).font("Helvetica");
  doc.text(`Freight Charges (${shipment.shipmentType})`, 50, y, { width: 140 });
  doc.text("996511", 200, y);
  doc.text("1.00", 280, y);

  const basePrice = (shipment.price || 0) / 1.18;
  doc.text(basePrice.toFixed(2), 350, y);
  doc.font("Helvetica-Bold").text(basePrice.toFixed(2), 450, y);

  y += 30;
  doc
    .moveTo(40, y)
    .lineTo(doc.page.width - 40, y)
    .stroke("#e2e8f0");

  // TOTALS SECTION
  y += 20;
  const totalX = 350;
  const lineH = 20;

  doc
    .fillColor("#64748b")
    .fontSize(10)
    .font("Helvetica")
    .text("Taxable Value:", totalX, y);
  doc
    .fillColor("#1e293b")
    .font("Helvetica-Bold")
    .text("₹" + basePrice.toFixed(2), 480, y);

  y += lineH;
  doc.fillColor("#64748b").font("Helvetica").text("CGST (9%):", totalX, y);
  doc
    .fillColor("#1e293b")
    .font("Helvetica-Bold")
    .text("₹" + ((shipment.price - basePrice) / 2).toFixed(2), 480, y);

  y += lineH;
  doc.fillColor("#64748b").font("Helvetica").text("SGST (9%):", totalX, y);
  doc
    .fillColor("#1e293b")
    .font("Helvetica-Bold")
    .text("₹" + ((shipment.price - basePrice) / 2).toFixed(2), 480, y);

  y += lineH + 5;
  doc.rect(totalX - 10, y - 5, 210, 35).fill("#1e40af");
  doc
    .fillColor("#ffffff")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("TOTAL PAYABLE:", totalX, y + 8);
  doc.text("₹" + shipment.price?.toFixed(2), 480, y + 8);

  y += 60;

  // BANK DETAILS & TERMS
  doc
    .fillColor("#1e40af")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("BANK DETAILS", col1, y);
  doc
    .fillColor("#475569")
    .fontSize(9)
    .font("Helvetica")
    .text("Bank: HDFC BANK LTD", col1, y + 15)
    .text("A/c No: 50200012345678", col1, y + 27)
    .text("IFSC: HDFC0001234", col1, y + 39);

  doc
    .fillColor("#1e40af")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("TERMS & CONDITIONS", col2, y);
  doc
    .fillColor("#475569")
    .fontSize(8)
    .font("Helvetica")
    .text("1. Payment is due within 30 days of invoice date.", col2, y + 15)
    .text("2. Please quote Invoice No. in all correspondence.", col2, y + 27)
    .text("3. This is a computer generated document.", col2, y + 39);

  y += 80;

  // Footer / Seal
  if (fs.existsSync(sealPath)) {
    doc.image(sealPath, 40, y, { width: 80 });
  }

  if (fs.existsSync(signPath)) {
    doc.image(signPath, doc.page.width - 140, y, { width: 90 });
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor("#1e293b")
      .text("AUTHORIZED SIGNATORY", doc.page.width - 140, y + 50);
  }

  drawFooter(doc);
}

// ==========================================
// 4. DISPATCH MANIFEST RENDERER
// ==========================================
function renderDispatchManifest(doc, shipment, actor) {
  const title = "DISPATCH MANIFEST & LOADING RECORD";

  // Header with colored bar
  doc.rect(0, 0, doc.page.width, 100).fill("#1e40af");
  doc
    .fillColor("#ffffff")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(title, 40, 35);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text("JSHS LOGISTICS OPERATIONS • SECURE CHAIN OF CUSTODY", 40, 65);

  let y = 120;

  // Manifest Meta
  doc.rect(40, y, doc.page.width - 80, 30).fill("#f8fafc");
  doc
    .fillColor("#1e293b")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("MANIFEST ID:", 50, y + 10);
  doc.font("Helvetica").text("MAN/JSHS/" + shipment.referenceId, 130, y + 10);
  doc.font("Helvetica-Bold").text("DATE:", 350, y + 10);
  doc.font("Helvetica").text(new Date().toLocaleString("en-IN"), 400, y + 10);

  y += 45;

  // Vehicle & Driver Block
  doc.rect(40, y, doc.page.width - 80, 80).stroke("#e2e8f0");
  doc.rect(40, y, doc.page.width - 80, 20).fill("#f1f5f9");
  doc
    .fillColor("#475569")
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("VEHICLE & CREW ASSIGNMENT", 50, y + 6);

  doc
    .fillColor("#1e293b")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(
      "VEHICLE: " + (shipment.assignedVehicleId?.plateNumber || "NOT ASSIGNED"),
      50,
      y + 30,
    );
  doc
    .font("Helvetica")
    .text(
      "Type: " + (shipment.assignedVehicleId?.type || "Standard"),
      50,
      y + 45,
    );
  doc.text("IoT Status: ACTIVE / ONLINE", 50, y + 60);

  doc
    .font("Helvetica-Bold")
    .text(
      "DRIVER: " + (shipment.assignedDriverId?.name || "NOT ASSIGNED"),
      320,
      y + 30,
    );
  doc
    .font("Helvetica")
    .text(
      "Contact: " + (shipment.assignedDriverId?.phone || "N/A"),
      320,
      y + 45,
    );
  doc.text("License Verified: YES", 320, y + 60);

  y += 100;

  // Cargo Details Table
  doc.rect(40, y, doc.page.width - 80, 20).fill("#1e293b");
  doc
    .fillColor("#ffffff")
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("ITEM DESCRIPTION", 50, y + 6);
  doc.text("QUANTITY", 250, y + 6);
  doc.text("WEIGHT (KG)", 350, y + 6);
  doc.text("VOLUME", 450, y + 6);

  y += 25;
  doc
    .fillColor("#1e293b")
    .fontSize(10)
    .font("Helvetica")
    .text(shipment.shipmentType + " Consignment", 50, y);
  doc.text("1 UNIT", 250, y);
  doc.text((shipment.packageDetails?.weight || 0).toString(), 350, y);
  doc.text(shipment.packageDetails?.dimensions || "N/A", 450, y);

  y += 40;

  // Verification Checklist (Grid)
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("LOADING BAY VERIFICATION", 40, y);
  y += 20;

  const checks = [
    { l: "Cargo Weight Verified", s: "[  ] OK" },
    { l: "Packaging Inspected", s: "[  ] OK" },
    { l: "Hazmat Check (if any)", s: "[  ] N/A" },
    { l: "IoT Sensor Attached", s: "[  ] OK" },
    { l: "E-Way Bill Handover", s: "[  ] OK" },
    { l: "Vehicle Seal Intact", s: "[  ] OK" },
  ];

  let cx = 40;
  checks.forEach((c, i) => {
    doc.fontSize(9).font("Helvetica").fillColor("#475569").text(c.l, cx, y);
    doc
      .font("Helvetica-Bold")
      .fillColor("#1e293b")
      .text(c.s, cx + 110, y);
    cx += 180;
    if ((i + 1) % 2 === 0) {
      y += 20;
      cx = 40;
    }
  });

  y += 40;
  doc.rect(40, y, doc.page.width - 80, 60).stroke("#e2e8f0");
  doc
    .fontSize(8)
    .font("Helvetica-Oblique")
    .fillColor("#94a3b8")
    .text("OPERATIONS NOTES:", 50, y + 10)
    .text(
      "Ensure vehicle maintains specified temperature range throughout the transit. GPS pings set to 5-minute intervals.",
      50,
      y + 25,
      { width: 450 },
    );

  y += 100;
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#1e293b")
    .text("Loading Supervisor", 40, y);
  doc.text("Driver Acceptance", 350, y);

  drawFooter(doc);
}

// ==========================================
// 5. VEHICLE INSPECTION RENDERER
// ==========================================
function renderVehicleInspection(doc, shipment, actor) {
  const title = "VEHICLE PRE-JOURNEY INSPECTION";

  doc.rect(0, 0, doc.page.width, 100).fill("#059669"); // Emerald
  doc
    .fillColor("#ffffff")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(title, 40, 35);
  doc
    .fontSize(10)
    .font("Helvetica")
    .text("SAFETY COMPLIANCE & MAINTENANCE RECORD", 40, 65);

  let y = 120;
  const vehicle = shipment.assignedVehicleId || {};

  doc
    .fillColor("#1e293b")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("VEHICLE SPECIFICATIONS", 40, y);
  y += 20;

  const vGrid = [
    { l: "Registration No", v: vehicle.plateNumber || "N/A" },
    { l: "Make/Model", v: vehicle.model || "Standard Fleet" },
    { l: "Current Odo", v: (vehicle.odometerKm || 0) + " KM" },
    { l: "Fuel Status", v: (vehicle.currentFuelLiters || 0) + " L" },
  ];

  let vx = 40;
  vGrid.forEach((v) => {
    doc.fontSize(8).fillColor("#64748b").text(v.l, vx, y);
    doc
      .fontSize(10)
      .fillColor("#1e293b")
      .font("Helvetica-Bold")
      .text(v.v, vx, y + 12);
    vx += 130;
  });

  y += 50;

  // Maintenance Checklist Table
  doc.rect(40, y, doc.page.width - 80, 25).fill("#f1f5f9");
  doc
    .fillColor("#1e293b")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("MAINTENANCE CHECKLIST", 50, y + 8);
  doc.text("STATUS", 450, y + 8);
  y += 35;

  const safetyChecks = [
    { item: "Brake System (Primary & Emergency)", status: "PASSED" },
    { item: "Tyre Pressure & Tread Condition", status: "PASSED" },
    { item: "Engine Oil & Coolant Levels", status: "PASSED" },
    { item: "Headlights, Indicators & Brake Lights", status: "PASSED" },
    { item: "IoT Telemetry & GPS Connectivity", status: "PASSED" },
    { item: "Temperature Control Unit (Chiller)", status: "PASSED" },
    { item: "Fire Extinguisher & First Aid Kit", status: "PASSED" },
    { item: "Vehicle Documentation (RC/PUC/INS)", status: "PASSED" },
  ];

  safetyChecks.forEach((s) => {
    doc.fontSize(10).font("Helvetica").fillColor("#1e293b").text(s.item, 50, y);
    doc.font("Helvetica-Bold").fillColor("#059669").text(s.status, 450, y);
    doc
      .moveTo(40, y + 15)
      .lineTo(doc.page.width - 40, y + 15)
      .stroke("#f1f5f9");
    y += 25;
  });

  y += 40;
  doc.rect(40, y, doc.page.width - 80, 80).fill("#ecfdf5");
  doc
    .fillColor("#065f46")
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("FITNESS CERTIFICATION", 50, y + 15);
  doc
    .fontSize(9)
    .font("Helvetica")
    .text(
      "The vehicle listed above has undergone a comprehensive safety inspection and is certified FIT FOR TRANSIT for the assigned route. All IoT systems are functional.",
      50,
      y + 35,
      { width: 450 },
    );

  y += 110;
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#1e293b")
    .text("Certified Maintenance Engineer", 40, y);
  doc.text("Fleet Manager Approval", 350, y);

  drawFooter(doc);
}

// ==========================================
// 6. E-WAY BILL RENDERER (Indian Format Style)
// ==========================================
function renderEWayBill(doc, shipment, actor) {
  const title = "E-WAY BILL (ELECTRONIC WAY BILL)";

  // Outer border
  doc
    .rect(40, 40, doc.page.width - 80, doc.page.height - 100)
    .stroke("#000000");

  // Header
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(title, 40, 60, { align: "center", width: doc.page.width - 80 });

  let y = 85;
  doc
    .moveTo(40, y)
    .lineTo(doc.page.width - 40, y)
    .stroke();

  y += 10;
  doc.fontSize(10).font("Helvetica-Bold").text("E-Way Bill No:", 55, y);
  doc
    .font("Helvetica")
    .text("1812" + Math.floor(Math.random() * 100000000), 150, y);
  doc.font("Helvetica-Bold").text("Generated Date:", 350, y);
  doc.font("Helvetica").text(new Date().toLocaleString("en-IN"), 450, y);

  y += 20;
  doc.font("Helvetica-Bold").text("Generated By:", 55, y);
  doc
    .font("Helvetica")
    .text("27AAACG1234A1Z1 - JSHS LOGISTICS PVT LTD", 150, y);
  doc.font("Helvetica-Bold").text("Valid Until:", 350, y);
  doc
    .font("Helvetica")
    .text(new Date(Date.now() + 48 * 3600000).toLocaleString("en-IN"), 450, y);

  y += 25;
  doc
    .moveTo(40, y)
    .lineTo(doc.page.width - 40, y)
    .stroke();

  // PART A
  y += 10;
  doc.fontSize(11).font("Helvetica-Bold").text("PART - A", 55, y);
  y += 20;

  const customer = shipment.customerId || {};
  const consignee = shipment.consignee || {};

  // Supplier & Recipient Grid
  doc.fontSize(9);
  doc.font("Helvetica-Bold").text("1. GSTIN of Supplier", 55, y);
  doc.font("Helvetica").text(customer.gstNumber || "27AAACG1234A1Z1", 180, y);
  doc.font("Helvetica-Bold").text("2. Place of Dispatch", 340, y);
  doc.font("Helvetica").text(shipment.origin?.name || "Mumbai", 450, y);

  y += 18;
  doc.font("Helvetica-Bold").text("3. GSTIN of Recipient", 55, y);
  doc
    .font("Helvetica")
    .text("Unregistered / " + (consignee.name || "Receiver"), 180, y);
  doc.font("Helvetica-Bold").text("4. Place of Delivery", 340, y);
  doc.font("Helvetica").text(shipment.destination?.name || "Pune", 450, y);

  y += 18;
  doc.font("Helvetica-Bold").text("5. Document No.", 55, y);
  doc.font("Helvetica").text("INV/" + shipment.referenceId, 180, y);
  doc.font("Helvetica-Bold").text("6. Document Date", 340, y);
  doc.font("Helvetica").text(new Date().toLocaleDateString("en-IN"), 450, y);

  y += 18;
  doc.font("Helvetica-Bold").text("7. Value of Goods", 55, y);
  doc.font("Helvetica").text("₹ " + (shipment.price * 12.5).toFixed(2), 180, y);
  doc.font("Helvetica-Bold").text("8. HSN Code", 340, y);
  doc.font("Helvetica").text("996511", 450, y);

  y += 18;
  doc.font("Helvetica-Bold").text("9. Reason for Trans.", 55, y);
  doc.font("Helvetica").text("Outward Supply", 180, y);

  y += 30;
  doc
    .moveTo(40, y)
    .lineTo(doc.page.width - 40, y)
    .stroke();

  // PART B
  y += 10;
  doc.fontSize(11).font("Helvetica-Bold").text("PART - B", 55, y);
  y += 20;
  doc.fontSize(9);
  doc.font("Helvetica-Bold").text("Mode", 55, y);
  doc.font("Helvetica").text("Road", 180, y);
  doc.font("Helvetica-Bold").text("Vehicle No.", 340, y);
  doc
    .font("Helvetica")
    .text(shipment.assignedVehicleId?.plateNumber || "TBD", 450, y);

  y += 18;
  doc.font("Helvetica-Bold").text("Transporter ID", 55, y);
  doc.font("Helvetica").text("JSHS-LOG-001", 180, y);
  doc.font("Helvetica-Bold").text("Transporter Name", 340, y);
  doc.font("Helvetica").text("JSHS LOGISTICS PVT LTD", 450, y);

  y += 50;
  // QR Code Placeholder
  doc.rect(doc.page.width - 140, y, 80, 80).stroke();
  doc
    .fontSize(7)
    .text("DIGITAL QR CODE FOR VERIFICATION", doc.page.width - 140, y + 85, {
      width: 80,
      align: "center",
    });

  doc.fontSize(10).font("Helvetica-Bold").text("Declaration:", 55, y);
  doc
    .fontSize(8)
    .font("Helvetica")
    .text(
      "I hereby declare that the details given above are true and correct to the best of my knowledge and belief. In case any of the above information is found to be false or untrue, I am aware that I may be held liable for it.",
      55,
      y + 15,
      { width: 300 },
    );

  y = doc.page.height - 120;
  doc.image(logoPath, 55, y, { width: 80 });
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("Digitally signed by GST System", 0, y + 90, {
      align: "center",
      width: doc.page.width,
    });
}

// ==========================================
// 7. CONSIGNMENT NOTE RENDERER
// ==========================================
function renderConsignmentNote(doc, shipment, actor) {
  const title = "GOODS CONSIGNMENT NOTE (LORRY RECEIPT)";

  doc.rect(0, 0, doc.page.width, 15).fill("#000");

  let y = 40;
  doc
    .fillColor("#000")
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("JSHS LOGISTICS", 40, y);
  doc
    .fontSize(8)
    .font("Helvetica")
    .text("Regd Office: Sector 12, Hiranandani, Thane - 400607", 40, y + 20);

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(title, 0, y + 10, {
      align: "right",
      x: 40,
      width: doc.page.width - 80,
    });

  y += 60;
  doc.rect(40, y, doc.page.width - 80, 25).fill("#f1f5f9");
  doc
    .fillColor("#1e293b")
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("LR NO: JSHS/LR/" + shipment.referenceId, 50, y + 8);
  doc.text("DATE: " + new Date().toLocaleDateString("en-IN"), 400, y + 8);

  y += 40;

  // Consignor/Consignee Grid
  doc.rect(40, y, doc.page.width - 80, 110).stroke();
  doc
    .moveTo(doc.page.width / 2, y)
    .lineTo(doc.page.width / 2, y + 110)
    .stroke();

  const customer = shipment.customerId || {};
  const consignee = shipment.consignee || {};

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("CONSIGNOR (From):", 50, y + 10);
  doc
    .font("Helvetica-Bold")
    .text(customer.name || "Customer", 50, y + 25, { width: 220 });
  doc
    .font("Helvetica")
    .text(customer.address || "Address registered", 50, y + 38, { width: 220 });
  doc.text("GSTIN: " + (customer.gstNumber || "N/A"), 50, y + 85);

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("CONSIGNEE (To):", doc.page.width / 2 + 10, y + 10);
  doc
    .font("Helvetica-Bold")
    .text(consignee.name || "Receiver", doc.page.width / 2 + 10, y + 25, {
      width: 220,
    });
  doc
    .font("Helvetica")
    .text(
      shipment.destination?.address ||
        shipment.destination?.name ||
        "Destination",
      doc.page.width / 2 + 10,
      y + 38,
      { width: 220 },
    );
  doc.text(
    "Contact: " + (consignee.phone || "N/A"),
    doc.page.width / 2 + 10,
    y + 85,
  );

  y += 125;

  // Goods Table
  doc.rect(40, y, doc.page.width - 80, 20).fill("#1e293b");
  doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
  doc.text("PKG TYPE", 50, y + 6);
  doc.text("DESCRIPTION OF GOODS", 130, y + 6);
  doc.text("ACTUAL WT", 330, y + 6);
  doc.text("CHG. WT", 420, y + 6);
  doc.text("METHOD", 500, y + 6);

  y += 25;
  doc.fillColor("#1e293b").font("Helvetica").text("1 BOX", 50, y);
  doc.text(shipment.shipmentType + " Materials", 130, y, { width: 180 });
  doc.text((shipment.packageDetails?.weight || 0) + " KG", 330, y);
  doc.text((shipment.packageDetails?.weight || 0) + " KG", 420, y);
  doc.text("Prepaid", 500, y);

  y += 40;
  doc.rect(40, y, doc.page.width - 80, 50).stroke("#e2e8f0");
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .text("NOTES & REMARKS:", 50, y + 10);
  doc
    .font("Helvetica")
    .text(
      "Received goods in good condition. Subject to Mumbai Jurisdiction. Standard JSHS liability clauses apply.",
      50,
      y + 22,
      { width: 450 },
    );

  y += 70;
  doc.fontSize(10).font("Helvetica-Bold").text("Consignor Signature", 40, y);
  doc.text("For JSHS LOGISTICS PVT LTD", doc.page.width - 200, y);

  if (fs.existsSync(signPath)) {
    doc.image(signPath, doc.page.width - 180, y + 10, { width: 80 });
  }

  drawFooter(doc);
}

function drawFooter(doc) {
  const footerY = doc.page.height - 40;
  doc
    .fontSize(7)
    .fillColor("#94a3b8")
    .text(
      "© JSHS LOGISTICS PRIVATE LIMITED • GST REGULATED ENTITY • AUTO-GENERATED AUTHENTIC RECORD",
      40,
      footerY,
      {
        width: doc.page.width - 80,
        align: "center",
      },
    );
}
