import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "..", "..", "uploads");
const assetsDir = path.join(__dirname, "..", "assets");
const fontsDir = path.join(__dirname, "..", "fonts");

// Enhanced font configuration for better rendering
const FONT_CONFIG = {
  regular: {
    family: "Helvetica",
    size: 10,
    lineHeight: 1.4
  },
  bold: {
    family: "Helvetica-Bold",
    size: 10,
    lineHeight: 1.4
  },
  header: {
    family: "Helvetica-Bold",
    size: 14,
    lineHeight: 1.2
  },
  title: {
    family: "Helvetica-Bold",
    size: 18,
    lineHeight: 1.1
  }
};

// Document layout configuration
const LAYOUT_CONFIG = {
  margin: 50,
  headerHeight: 120,
  footerHeight: 80,
  contentWidth: 0,
  pageHeight: 0,
  pageWidth: 0
};

// Color scheme for professional documents
const COLOR_SCHEME = {
  primary: "#0f172a",      // Dark slate
  secondary: "#1e293b",    // Slate
  accent: "#3b82f6",       // Blue
  success: "#059669",      // Green
  warning: "#d97706",      // Amber
  danger: "#dc2626",       // Red
  muted: "#64748b",        // Gray
  light: "#f8fafc",        // Light gray
  border: "#e2e8f0"        // Border gray
};

/**
 * Enhanced PDF Generator with improved fonts and alignment
 */
export class EnhancedPdfGenerator {
  constructor() {
    this.doc = null;
    this.currentY = 0;
    this.pageNumber = 1;
  }

  /**
   * Initialize document with proper configuration
   */
  initDocument(options = {}) {
    const pdfOptions = {
      size: "A4",
      margin: LAYOUT_CONFIG.margin,
      ...options
    };

    this.doc = new PDFDocument(pdfOptions);
    
    // Set document metadata
    this.doc.info = {
      Title: options.title || "JSHS Logistics Document",
      Author: "JSHS Logistics",
      Subject: options.subject || "Logistics Documentation",
      Creator: "JSHS Logistics System",
      Producer: "Enhanced PDF Generator"
    };

    // Calculate layout dimensions
    LAYOUT_CONFIG.pageWidth = this.doc.page.width;
    LAYOUT_CONFIG.pageHeight = this.doc.page.height;
    LAYOUT_CONFIG.contentWidth = LAYOUT_CONFIG.pageWidth - (2 * LAYOUT_CONFIG.margin);

    this.currentY = LAYOUT_CONFIG.margin;
    this.pageNumber = 1;

    return this.doc;
  }

  /**
   * Enhanced header with better alignment and fonts
   */
  addEnhancedHeader(title, subtitle = "") {
    // Header background
    this.doc
      .rect(0, 0, LAYOUT_CONFIG.pageWidth, LAYOUT_CONFIG.headerHeight)
      .fill(COLOR_SCHEME.primary);

    // Company logo or name
    const logoPath = path.join(__dirname, "..", "..", "..", "frontend", "public", "logo.png");
    if (fs.existsSync(logoPath)) {
      try {
        this.doc.image(logoPath, LAYOUT_CONFIG.margin, 20, { width: 80 });
      } catch (error) {
        // Fallback to text if image fails
        this.addText("JSHS LOGISTICS", LAYOUT_CONFIG.margin, 45, {
          font: FONT_CONFIG.title,
          color: "#ffffff"
        });
      }
    } else {
      this.addText("JSHS LOGISTICS", LAYOUT_CONFIG.margin, 45, {
        font: FONT_CONFIG.title,
        color: "#ffffff"
      });
    }

    // Document title
    this.addText(title, LAYOUT_CONFIG.pageWidth - LAYOUT_CONFIG.margin, 45, {
      font: FONT_CONFIG.header,
      color: "#ffffff",
      align: "right"
    });

    // Subtitle if provided
    if (subtitle) {
      this.addText(subtitle, LAYOUT_CONFIG.pageWidth - LAYOUT_CONFIG.margin, 70, {
        font: { ...FONT_CONFIG.regular, size: 8 },
        color: "#94a3b8",
        align: "right"
      });
    }

    this.currentY = LAYOUT_CONFIG.headerHeight + 20;
  }

  /**
   * Add shipment information section with proper alignment
   */
  addShipmentInfo(shipment) {
    const customer = shipment.customerId || {};
    const consignee = shipment.consignee || {};

    // Section title
    this.addText("SHIPMENT DETAILS", LAYOUT_CONFIG.margin, this.currentY, {
      font: FONT_CONFIG.bold,
      color: COLOR_SCHEME.primary
    });
    this.currentY += 25;

    // Reference and date
    this.addText(`Reference: ${shipment.referenceId}`, LAYOUT_CONFIG.margin, this.currentY, {
      font: FONT_CONFIG.bold,
      color: COLOR_SCHEME.secondary
    });
    
    const generatedDate = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    
    this.addText(`Generated: ${generatedDate}`, LAYOUT_CONFIG.pageWidth - LAYOUT_CONFIG.margin, this.currentY, {
      font: FONT_CONFIG.regular,
      color: COLOR_SCHEME.muted,
      align: "right"
    });
    
    this.currentY += 30;

    // Two-column layout for sender and receiver
    const colWidth = (LAYOUT_CONFIG.contentWidth - 20) / 2;
    
    // Origin/Consignor
    this.addInfoBox("ORIGIN / CONSIGNOR", LAYOUT_CONFIG.margin, this.currentY, colWidth, [
      { label: "Name", value: customer.legalName || customer.name || "JSHS Customer" },
      { label: "Address", value: customer.address || "Address not registered" },
      { label: "GST", value: customer.gstNumber || "N/A" },
      { label: "Contact", value: customer.phone || customer.email || "N/A" }
    ]);

    // Destination/Consignee
    this.addInfoBox("DESTINATION / CONSIGNEE", LAYOUT_CONFIG.margin + colWidth + 20, this.currentY, colWidth, [
      { label: "Name", value: consignee.name || "Shipment Receiver" },
      { label: "Address", value: shipment.destination?.address || shipment.destination?.name || "Destination Hub" },
      { label: "Contact", value: consignee.contact || "N/A" },
      { label: "Status", value: shipment.status.replace(/_/g, " ") }
    ]);

    this.currentY += 130;
  }

  /**
   * Add information box with consistent styling
   */
  addInfoBox(title, x, y, width, fields) {
    // Box background
    this.doc
      .rect(x, y, width, 120)
      .fillAndStroke(COLOR_SCHEME.light, COLOR_SCHEME.border);

    // Title
    this.addText(title, x + 10, y + 10, {
      font: { ...FONT_CONFIG.bold, size: 9 },
      color: COLOR_SCHEME.primary
    });

    // Fields
    let fieldY = y + 30;
    fields.forEach(field => {
      this.addText(`${field.label}:`, x + 10, fieldY, {
        font: FONT_CONFIG.bold,
        color: COLOR_SCHEME.secondary,
        size: 8
      });
      
      this.addText(field.value, x + 80, fieldY, {
        font: FONT_CONFIG.regular,
        color: COLOR_SCHEME.secondary,
        size: 8,
        maxWidth: width - 90
      });
      
      fieldY += 15;
    });
  }

  /**
   * Enhanced text rendering with better alignment
   */
  addText(text, x, y, options = {}) {
    const {
      font = FONT_CONFIG.regular,
      color = COLOR_SCHEME.primary,
      align = "left",
      maxWidth = null
    } = options;

    // Set font properties
    this.doc
      .fillColor(color)
      .fontSize(font.size)
      .font(font.family);

    // Calculate text width if needed
    let textX = x;
    let textWidth = maxWidth || LAYOUT_CONFIG.contentWidth;

    if (align === "right" && !maxWidth) {
      const textWidthActual = this.doc.widthOfString(text);
      textX = x - textWidthActual;
    } else if (align === "center" && !maxWidth) {
      textWidth = LAYOUT_CONFIG.contentWidth;
    }

    // Add text with proper alignment
    this.doc.text(text, textX, y, {
      width: maxWidth || textWidth,
      align: align,
      lineGap: font.lineHeight || 2
    });
  }

  /**
   * Add table with consistent styling
   */
  addTable(headers, rows, x, y, options = {}) {
    const {
      colWidths = [],
      rowHeight = 25,
      headerColor = COLOR_SCHEME.primary,
      rowColors = [COLOR_SCHEME.light, "#ffffff"]
    } = options;

    const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
    let currentY = y;

    // Header
    this.doc
      .rect(x, currentY, tableWidth, rowHeight)
      .fill(headerColor);

    headers.forEach((header, index) => {
      const colX = x + colWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
      this.addText(header, colX + 5, currentY + 8, {
        font: FONT_CONFIG.bold,
        color: "#ffffff",
        size: 9
      });
    });

    currentY += rowHeight;

    // Rows
    rows.forEach((row, rowIndex) => {
      const rowColor = rowColors[rowIndex % rowColors.length];
      
      this.doc
        .rect(x, currentY, tableWidth, rowHeight)
        .fillAndStroke(rowColor, COLOR_SCHEME.border);

      row.forEach((cell, colIndex) => {
        const colX = x + colWidths.slice(0, colIndex).reduce((sum, width) => sum + width, 0);
        this.addText(cell, colX + 5, currentY + 8, {
          font: FONT_CONFIG.regular,
          color: COLOR_SCHEME.secondary,
          size: 8,
          maxWidth: colWidths[colIndex] - 10
        });
      });

      currentY += rowHeight;
    });

    return currentY;
  }

  /**
   * Add footer with page numbers
   */
  addFooter() {
    const footerY = LAYOUT_CONFIG.pageHeight - LAYOUT_CONFIG.footerHeight;
    
    // Footer line
    this.doc
      .moveTo(LAYOUT_CONFIG.margin, footerY)
      .lineTo(LAYOUT_CONFIG.pageWidth - LAYOUT_CONFIG.margin, footerY)
      .strokeColor(COLOR_SCHEME.border)
      .stroke();

    // Company info
    this.addText("JSHS Logistics - Next-Gen Logistics Solutions", LAYOUT_CONFIG.margin, footerY + 20, {
      font: FONT_CONFIG.regular,
      color: COLOR_SCHEME.muted,
      size: 8
    });

    // Page number
    this.addText(`Page ${this.pageNumber}`, LAYOUT_CONFIG.pageWidth - LAYOUT_CONFIG.margin, footerY + 20, {
      font: FONT_CONFIG.regular,
      color: COLOR_SCHEME.muted,
      size: 8,
      align: "right"
    });
  }

  /**
   * Generate enhanced dispatch manifest
   */
  generateDispatchManifest(shipment, actor) {
    this.initDocument({ title: "Dispatch Manifest - JSHS Logistics" });
    
    this.addEnhancedHeader("DISPATCH MANIFEST", "Pre-Journey Vehicle & Cargo Verification");
    this.addShipmentInfo(shipment);
    
    // Vehicle details
    this.addText("VEHICLE INFORMATION", LAYOUT_CONFIG.margin, this.currentY, {
      font: FONT_CONFIG.bold,
      color: COLOR_SCHEME.primary
    });
    this.currentY += 20;

    const vehicle = shipment.assignedVehicleId || {};
    const vehicleFields = [
      { label: "Registration", value: vehicle.plateNumber || "N/A" },
      { label: "Model", value: vehicle.model || "N/A" },
      { label: "Type", value: vehicle.type || "N/A" },
      { label: "Capacity", value: vehicle.capacity || "N/A" }
    ];

    vehicleFields.forEach(field => {
      this.addText(`${field.label}: ${field.value}`, LAYOUT_CONFIG.margin, this.currentY, {
        font: FONT_CONFIG.regular,
        color: COLOR_SCHEME.secondary
      });
      this.currentY += 15;
    });

    this.currentY += 20;

    // Cargo manifest
    this.addText("CARGO MANIFEST", LAYOUT_CONFIG.margin, this.currentY, {
      font: FONT_CONFIG.bold,
      color: COLOR_SCHEME.primary
    });
    this.currentY += 20;

    const cargoHeaders = ["Item", "Description", "Weight (kg)", "Status"];
    const cargoRows = [
      ["1", shipment.shipmentType || "General Cargo", `${shipment.package?.weight || 0} kg`, "Loaded"]
    ];

    this.currentY = this.addTable(cargoHeaders, cargoRows, LAYOUT_CONFIG.margin, this.currentY);
    this.currentY += 30;

    // Driver signature section
    this.addText("VERIFICATION & SIGNATURES", LAYOUT_CONFIG.margin, this.currentY, {
      font: FONT_CONFIG.bold,
      color: COLOR_SCHEME.primary
    });
    this.currentY += 30;

    this.addText("Driver Name: ___________________________", LAYOUT_CONFIG.margin, this.currentY);
    this.addText("Signature: ____________________________", LAYOUT_CONFIG.margin + 250, this.currentY);
    this.currentY += 40;

    this.addText("Dispatch Manager: _____________________", LAYOUT_CONFIG.margin, this.currentY);
    this.addText("Date: _________________________________", LAYOUT_CONFIG.margin + 250, this.currentY);

    this.addFooter();

    return this.doc;
  }

  /**
   * Generate enhanced GST invoice
   */
  generateGSTInvoice(shipment, actor, options = {}) {
    this.initDocument({ 
      title: "GST Invoice - JSHS Logistics",
      subject: "Tax Invoice for Logistics Services"
    });
    
    this.addEnhancedHeader("TAX INVOICE", "GST Compliant Billing Document");
    this.addShipmentInfo(shipment);

    // Invoice details table
    this.addText("INVOICE DETAILS", LAYOUT_CONFIG.margin, this.currentY, {
      font: FONT_CONFIG.bold,
      color: COLOR_SCHEME.primary
    });
    this.currentY += 20;

    const invoiceHeaders = ["Description", "HSN/SAC", "Quantity", "Rate", "Amount"];
    const invoiceRows = [
      ["Logistics Services", "9965", "1", "₹2,500.00", "₹2,500.00"],
      ["Handling Charges", "9967", "1", "₹300.00", "₹300.00"],
      ["", "", "", "Subtotal", "₹2,800.00"],
      ["", "", "", "CGST (9%)", "₹252.00"],
      ["", "", "", "SGST (9%)", "₹252.00"],
      ["", "", "", "Total", "₹3,304.00"]
    ];

    this.currentY = this.addTable(invoiceHeaders, invoiceRows, LAYOUT_CONFIG.margin, this.currentY);
    this.currentY += 30;

    // Terms and conditions
    this.addText("TERMS & CONDITIONS", LAYOUT_CONFIG.margin, this.currentY, {
      font: FONT_CONFIG.bold,
      color: COLOR_SCHEME.primary
    });
    this.currentY += 20;

    const terms = [
      "1. Payment due within 30 days of invoice date",
      "2. Interest @18% p.a. will be charged on overdue payments",
      "3. Subject to Mumbai jurisdiction",
      "4. Goods once dispatched cannot be returned"
    ];

    terms.forEach(term => {
      this.addText(term, LAYOUT_CONFIG.margin, this.currentY, {
        font: FONT_CONFIG.regular,
        color: COLOR_SCHEME.muted,
        size: 8
      });
      this.currentY += 12;
    });

    this.addFooter();

    return this.doc;
  }

  /**
   * Finalize and save document
   */
  finalize(fileName) {
    const absPath = path.join(uploadsDir, fileName);
    const relativePath = `/uploads/${fileName}`;

    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(absPath);
      this.doc.pipe(stream);
      this.doc.end();

      stream.on("finish", () => {
        resolve({
          fileName,
          relativePath,
          absolutePath: absPath
        });
      });

      stream.on("error", (err) => {
        reject(err);
      });
    });
  }
}

/**
 * Enhanced document generation function
 */
export async function generateEnhancedDocument({
  shipment,
  type,
  actor,
  options = {}
}) {
  const generator = new EnhancedPdfGenerator();
  
  const safeType = String(type || "DOCUMENT").toUpperCase();
  const baseName = safeType.toLowerCase();
  const ts = Date.now();
  const ref = shipment.referenceId || String(shipment._id || "").slice(-8);
  const fileName = `enhanced_${baseName}_${ref}_${ts}.pdf`;

  // Ensure uploads directory exists
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  let document;
  
  switch (safeType) {
    case "DISPATCH_MANIFEST":
      document = generator.generateDispatchManifest(shipment, actor);
      break;
    case "GST_INVOICE":
      document = generator.generateGSTInvoice(shipment, actor, options);
      break;
    default:
      // Fallback to standard document
      document = generator.generateDispatchManifest(shipment, actor);
  }

  return await generator.finalize(fileName);
}

/**
 * Script to regenerate documents with enhanced formatting
 */
export async function regenerateEnhancedDocuments() {
  console.log("🚀 Starting enhanced document regeneration...");
  
  try {
    // Connect to database (caller should handle this)
    const { Shipment } = await import("../models/Shipment.js");
    const { Document } = await import("../models/Document.js");
    const { User } = await import("../models/User.js");
    const { Vehicle } = await import("../models/Vehicle.js");

    console.log("📦 Fetching shipments...");
    
    const shipments = await Shipment.find({})
      .populate('customerId')
      .populate('assignedDriverId')
      .populate('assignedVehicleId')
      .limit(10); // Process 10 at a time

    console.log(`📝 Processing ${shipments.length} shipments...`);

    let successCount = 0;
    let errorCount = 0;

    for (const shipment of shipments) {
      try {
        console.log(`🔄 Processing shipment ${shipment.referenceId}...`);
        
        // Generate enhanced dispatch manifest
        const enhancedDoc = await generateEnhancedDocument({
          shipment,
          type: 'DISPATCH_MANIFEST',
          actor: shipment.assignedDriverId || shipment.customerId
        });

        console.log(`✅ Generated: ${enhancedDoc.fileName}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error processing ${shipment.referenceId}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n📊 Regeneration Complete:");
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📈 Total: ${successCount + errorCount}`);

  } catch (error) {
    console.error("❌ Fatal error in document regeneration:", error);
    throw error;
  }
}

// Export for use in other modules
export default {
  EnhancedPdfGenerator,
  generateEnhancedDocument,
  regenerateEnhancedDocuments
};