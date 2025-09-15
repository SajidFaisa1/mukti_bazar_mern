# Mukti Bazar System Components Reference

## Entity Overview

| Entity | Role | Key Functions |
|--------|------|---------------|
| 👤 **Client** | Shop Owner/Buyer | Browse products, place orders, negotiate prices, make payments |
| 🏪 **Vendor** | Producer/Farmer | Register with KYC, add products, manage inventory, create barter offers |
| 👑 **Admin** | System Administrator | Approve users/products, monitor fraud, manage system |

## Core Processes (Level 1)

| Process ID | Process Name | Key Sub-functions |
|------------|--------------|-------------------|
| 1.0 | User Management & Authentication | Registration, KYC verification, profile management, status control |
| 2.0 | Product Management & Catalog | Product creation, approval workflow, inventory tracking, search |
| 3.0 | Order Processing & Management | Cart management, order validation, fraud detection, fulfillment |
| 4.0 | Payment Processing | SSLCommerz integration, payment validation, transaction tracking |
| 5.0 | Communication & Messaging | Real-time chat, price negotiation, message history |
| 6.0 | Barter System Management | Vendor-to-vendor product exchange proposals and execution |
| 7.0 | Admin Oversight & Approval | User/product approval, fraud investigation, system control |
| 8.0 | Analytics & Reporting | Business intelligence, performance metrics, trend analysis |
| 9.0 | AI Services & Fraud Detection | ML-powered fraud detection, chatbot, plant disease detection |
| 10.0 | Notification System | Email notifications, real-time alerts, system messages |

## Key Data Stores

| Store ID | Store Name | Contents |
|----------|------------|----------|
| D1 | Users | User profiles, KYC data, authentication info |
| D2 | Products | Product catalog, inventory, pricing, images |
| D3 | Orders | Order details, status, fulfillment tracking |
| D4 | Messages | Chat history, negotiations, communications |
| D5 | Barter | Barter proposals, agreements, exchange history |
| D6 | Payments | Payment transactions, status, SSLCommerz data |
| D7 | Analytics | Business metrics, reports, performance data |
| D8 | Notifications | System notifications, alerts, messages |
| D9 | Audit Logs | System activities, fraud alerts, admin actions |

## External Services Integration

| Service | Purpose | Integration Type |
|---------|---------|------------------|
| 🔐 **Firebase Auth** | User authentication and session management | API Integration |
| 💳 **SSLCommerz** | Payment gateway for secure transactions | Sandbox Integration |
| ☁️ **Cloudinary** | Image storage and optimization | API Integration |
| 📧 **Email Service** | Notification delivery via email | SMTP Integration |
| 🔌 **WebSocket** | Real-time messaging and updates | Protocol Integration |

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React.js + Vite | User interface and client-side logic |
| **Backend** | Node.js + Express.js | API server and business logic |
| **Database** | MongoDB | Data persistence and storage |
| **AI/ML** | Python + TensorFlow | Fraud detection and AI features |
| **Authentication** | Firebase Auth | User authentication and authorization |
| **Payment** | SSLCommerz Sandbox | Payment processing |
| **Storage** | Cloudinary | Image and media storage |
| **Real-time** | WebSocket | Live messaging and notifications |

## Key Business Rules

1. **Vendor Verification**: All vendors must complete KYC and get admin approval before selling
2. **Product Approval**: All products require admin approval before becoming visible to clients
3. **Order Validation**: Large orders trigger fraud detection and may require admin approval
4. **Barter System**: Vendors can exchange products with other vendors through negotiated agreements
5. **Price Negotiation**: Clients can negotiate prices with vendors through the messaging system
6. **Syndicate Prevention**: Multi-layered approval and fraud detection to prevent market manipulation

## Data Flow Principles

- **Authentication Flow**: Firebase Auth → Backend Validation → User Session
- **Product Flow**: Vendor Upload → Admin Approval → Client Browse → Purchase
- **Order Flow**: Cart → Checkout → Fraud Check → Payment → Fulfillment
- **Communication Flow**: User Input → Real-time Delivery → Message Storage
- **Barter Flow**: Proposal Creation → Matching → Negotiation → Agreement → Exchange