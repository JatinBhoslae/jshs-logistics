# JSHS Logistics Platform

## Overview
JSHS Logistics is a state-of-the-art, AI-powered logistics management platform designed to streamline shipment operations for Managers, Drivers, and Customers. It features real-time tracking, AI-driven categorization, automated document generation, and a seamless onboarding process for fleet assets.

## Key Features

### 🚛 **Fleet Management**
- **Vehicle Onboarding**: comprehensive forms to onboard various vehicle types (Trucks, Vans, Bikes) with detailed specifications.
- **Driver Onboarding**: Full driver profile management including license validation, experience, and performance tracking.
- **Asset Health Monitoring**: Integration with vehicle health APIs to monitor fleet conditions.

### 📦 **Shipment Operations**
- **Smart Shipment Creation**: 
  - **AI Categorization**: Upload goods images and let our AI automatically categorize them (e.g., Kirana, Pharma, Electronics).
  - **Auto-Pricing**: Real-time cost estimation based on distance, weight, and delivery type.
- **Consignee Updates**: On-demand ability for customers update recipient details (Name/Contact) even after shipment creation.
- **Lifecycle Management**: End-to-end status tracking from `CREATED` to `DELIVERED` with audit trails.

### 📍 **Real-Time Tracking & IoT**
- **Live Location**: Interactive maps showing real-time vehicle location.
- **Predictive ETA**: AI-powered ETA calculations considering traffic and weather.
- **IoT Integration**: Monitoring of critical parameters like temperature and humidity for sensitive cargo.

### 📄 **Automated Documentation**
- **Auto-Generated Documents**: Instantly generate Manifests, Invoices, and Proof of Delivery (POD) in PDF format.
- **Digital Signatures**: E-sign capabilities for Drivers and Consignees.
- **Secure Access**: Role-based access control for sensitive documents.

### 💳 **Financials**
- **Razorpay Integration**: Seamless payment processing for shipments (Pay Now / Pay Later).
- **Driver Payouts**: Automated calculation of driver earnings and payout status tracking.

## Technology Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Leaflet Maps, Framer Motion.
- **Backend**: Node.js, Express, MongoDB, Mongoose.
- **Services**: Razorpay (Payments), Gemini AI (Categorization), PDFKit (Documents).

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- NPM or Yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/jshs-logistics.git
   cd jshs-logistics
   ```

2. **Install Dependencies**
   ```bash
   # Root directory (if workspaces are configured) or individually:
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. **Environment Setup**
   - Create `.env` in `backend/`:
     ```env
     PORT=4000
     MONGO_URI=mongodb://localhost:27017/bharti
     JWT_SECRET=your_jwt_secret
     RAZORPAY_KEY_ID=your_key
     RAZORPAY_KEY_SECRET=your_secret
     ...
     ```
   - Create `.env` in `frontend/`:
     ```env
     VITE_API_URL=http://localhost:4000/api
     VITE_RAZORPAY_KEY_ID=your_key
     ...
     ```

4. **Run the Application**
   ```bash
   # In backend directory
   npm run dev
   
   # In frontend directory
   npm run dev
   ```

## User Roles & Access

- **Manager**: Full administrative access to Fleet, Shipments, Analytics, and Financials.
- **Driver**: Access to assigned shipments, route navigation, and proof of upload.
- **Customer**: Create shipments, track active orders, update consignee details, and view invoices.

## Contributing
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---
**Hacknova 26 - Team JSHS**