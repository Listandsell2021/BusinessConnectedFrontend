# Billing and Invoice Management System

## Overview
This billing system generates invoices and manages income based on **accepted leads** and their stored prices from partner assignments. It ensures no duplicate revenue entries and uses the exact pricing that was set when leads were assigned to partners.

## How It Works

### 1. Lead Assignment Process
- When a lead is assigned to a partner, the current admin pricing is fetched and stored in `partnerAssignments` array
- Each assignment includes:
  - `leadPrice`: Price at time of assignment (from admin settings)
  - `partnerType`: Partner type (basic/exclusive)
  - `status`: Assignment status (pending/accepted/rejected)

### 2. Revenue Generation
- Revenue is automatically created when a partner **accepts** a lead
- Uses the stored `leadPrice` from the partner assignment (not current settings)
- Creates a revenue entry with 10% commission
- Prevents duplicate revenue entries

### 3. Invoice Generation
- Invoices are generated based on **accepted leads** in a billing period
- Uses stored prices from partner assignments
- Includes tax calculation (configurable, default 19%)
- Supports individual and bulk invoice generation

## API Endpoints

### Single Invoice Generation
```http
POST /api/invoices/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "partnerId": "60d5ecb54b24a3001f647123",
  "serviceType": "moving",
  "billingPeriod": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

### Bulk Invoice Generation
```http
POST /api/invoices/generate-bulk
Content-Type: application/json
Authorization: Bearer <token>

{
  "serviceType": "moving",
  "billingPeriod": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

### Get Billing-Ready Partners
```http
GET /api/invoices/billing-ready?serviceType=moving&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

### Income Summary
```http
GET /api/invoices/income-summary?startDate=2024-01-01&endDate=2024-01-31&serviceType=moving
Authorization: Bearer <token>
```

## Database Schema Updates

### PartnerAssignment Schema (in Lead model)
```javascript
{
  partner: ObjectId,
  status: 'pending'|'accepted'|'rejected'|'cancelled',
  assignedAt: Date,
  acceptedAt: Date,
  leadPrice: Number, // NEW: Price at time of assignment
  partnerType: 'basic'|'exclusive' // NEW: Partner type at assignment
}
```

### Invoice Items
```javascript
{
  leadId: ObjectId,
  leadNumber: String,
  serviceType: String,
  acceptedDate: Date,
  amount: Number, // From stored leadPrice
  description: String,
  customerInfo: {
    name: String,
    city: String
  }
}
```

## Key Features

### 1. Price Consistency
- Uses pricing at the time of assignment, not current settings
- Protects against pricing changes affecting past assignments
- Ensures accurate billing

### 2. Automatic Revenue Creation
- Revenue entries are created automatically when leads are accepted
- Prevents manual errors and duplicate entries
- Links directly to partner assignments

### 3. Comprehensive Analytics
- Income breakdown by service type
- Partner performance analysis
- Period-based reporting
- Average lead pricing

### 4. Billing Period Management
- Flexible date range selection
- Service type filtering
- Partner-specific billing
- Bulk operations for efficiency

## Usage Examples

### Generate Monthly Invoices for Moving Service
```javascript
// Generate invoices for all partners with accepted moving leads in January 2024
const invoices = await BillingService.generateBulkInvoices(
  'moving',
  {
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  },
  adminUserId
);
```

### Calculate Income for a Period
```javascript
// Get income summary for all services in Q1 2024
const income = await BillingService.calculateIncomeForPeriod({
  startDate: '2024-01-01',
  endDate: '2024-03-31'
});

console.log(`Total Income: €${income.totalIncome}`);
console.log(`Total Leads: ${income.totalLeads}`);
```

### Get Partners Ready for Billing
```javascript
// Find partners with accepted leads in the billing period
const partners = await BillingService.getBillingReadyPartners(
  'cleaning',
  {
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
);
```

## Migration
- Run the migration script to update existing data:
```bash
node scripts/migrate-partner-assignment-prices.js
```

## Admin Settings Integration
- Pricing is fetched from admin settings at assignment time
- Current pricing structure:
  - Moving: Basic €20, Exclusive €30
  - Cleaning: Basic €20, Exclusive €30
- Tax rate: 19% (configurable in settings)

## Error Handling
- Validates partner existence before assignment
- Prevents duplicate revenue entries
- Handles missing pricing gracefully with fallbacks
- Comprehensive error logging

## Security
- Super admin only access for invoice generation
- Partners can view their own invoices
- Audit logging for all billing operations
- Input validation and sanitization