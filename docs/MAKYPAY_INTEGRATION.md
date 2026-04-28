# MakyPay Integration Guide

Complete guide for integrating MakyPay payment gateway into your application.

## Overview

MakyPay is a domestic payment platform for Uganda that supports:
- **MTN Mobile Money** (prefixes: 077, 078, 076, 039, 031, 079)
- **Airtel Money** (prefixes: 070, 074, 075)
- **Card Payments** (Visa & Mastercard)

## Features

✅ Mobile Money Collections (MTN & Airtel)  
✅ Card Payment Collections  
✅ Transaction Status Tracking  
✅ Webhook Support for Real-time Updates  
✅ Automatic Provider Detection  
✅ Subscription Management  
✅ Transaction History  

## Setup Instructions

### 1. Get API Credentials

1. Sign up at [MakyPay Dashboard](https://wire-api.makylegacy.com)
2. Navigate to **Developers → API Keys**
3. Copy your credentials:
   - API Key (Public Identifier)
   - API Secret (Private Password)
   - **OR** Base64 Authorization Header (Recommended - pre-encoded)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Option 1: Use Base64 Header (Easiest - Recommended)
MAKYPAY_BASE64_AUTH=your_base64_authorization_header

# Option 2: Use API Key + Secret
MAKYPAY_API_KEY=your_api_key
MAKYPAY_API_SECRET=your_api_secret
```

**Note:** You only need either the Base64 header OR the API Key + Secret combination.

### 3. Create Database Table

Run the SQL migration to create the transactions table:

```bash
# Execute the SQL file in your Supabase SQL Editor
cat database/makypay_transactions.sql
```

Or manually run the SQL from `database/makypay_transactions.sql` in your Supabase dashboard.

### 4. Configure Webhook (Optional but Recommended)

1. In MakyPay Dashboard, go to **Settings → Webhooks**
2. Add your webhook URL: `https://yourdomain.com/api/makypay/webhook`
3. Select events to receive:
   - `collection.completed`
   - `collection.failed`
   - `collection.cancelled`

## Usage

### Mobile Money Payment

```typescript
import { MakyPayService } from '@/lib/makypay';

// Initiate mobile money collection
const result = await MakyPayService.collectMobileMoney({
  userId: 'user-uuid',
  phoneNumber: '0771234567', // or 256771234567
  amount: 10000, // UGX (500 - 10,000,000)
  description: 'Subscription payment',
});

console.log('Transaction UUID:', result.uuid);
console.log('Status:', result.status); // processing, completed, failed
```

### Card Payment

```typescript
// Initiate card payment
const result = await MakyPayService.collectCardPayment({
  userId: 'user-uuid',
  amount: 10000,
  description: 'Subscription payment',
});

// Redirect user to payment gateway
window.location.href = result.redirectUrl;
```

### Check Transaction Status

```typescript
// Check status
const status = await MakyPayService.checkTransactionStatus(transactionId);

if (status.isCompleted) {
  console.log('Payment successful!');
} else if (status.isFailed) {
  console.log('Payment failed:', status.displayStatus);
}
```

### Wait for Completion (with Polling)

```typescript
// Automatically poll until transaction completes
const result = await MakyPayService.waitForTransactionCompletion({
  transactionId: 'transaction-uuid',
  maxAttempts: 10,
  backoffSeconds: [2, 5, 10, 20, 30, 60],
});

if (result.isCompleted) {
  // Activate subscription
  await MakyPayService.completeSubscriptionPayment({
    userId: 'user-uuid',
    transactionId: result.uuid,
    subscriptionPlan: 'premium',
    subscriptionDuration: 30, // days
  });
}
```

## API Routes

### Initiate Payment
**POST** `/api/makypay/initiate`

```json
{
  "userId": "user-uuid",
  "phoneNumber": "0771234567", // Required for mobile money
  "amount": 10000,
  "description": "Subscription payment",
  "paymentMethod": "mobile_money", // or "card"
  "accessToken": "user-session-token"
}
```

### Check Status
**POST** `/api/makypay/status`

```json
{
  "transactionId": "transaction-uuid"
}
```

### Complete Subscription
**POST** `/api/makypay/complete`

```json
{
  "userId": "user-uuid",
  "transactionId": "transaction-uuid",
  "subscriptionPlan": "premium",
  "subscriptionDuration": 30,
  "accessToken": "user-session-token"
}
```

### Webhook Handler
**POST** `/api/makypay/webhook`

Automatically receives and processes webhook events from MakyPay.

## Phone Number Format

MakyPay accepts phone numbers in multiple formats:
- `0771234567` (local format)
- `256771234567` (international without +)
- `+256771234567` (international with +)

The service automatically formats numbers to `256XXXXXXXXX` (12 digits).

## Provider Detection

The system automatically detects the mobile money provider based on phone prefix:

| Prefix | Provider |
|--------|----------|
| 077, 078, 076, 039, 031, 079 | MTN Mobile Money |
| 070, 074, 075 | Airtel Money |

## Transaction Limits

- **Minimum:** 500 UGX
- **Maximum:** 10,000,000 UGX per transaction

## Transaction Statuses

| Status | Description |
|--------|-------------|
| `processing` | Payment initiated, waiting for user confirmation |
| `completed` | Payment successful |
| `failed` | Payment failed or rejected |

## Error Handling

```typescript
try {
  const result = await MakyPayService.collectMobileMoney({
    userId: 'user-uuid',
    phoneNumber: '0771234567',
    amount: 10000,
    description: 'Payment',
  });
} catch (error) {
  if (error instanceof MakyPayException) {
    console.error('MakyPay Error:', error.message);
    // Handle specific MakyPay errors
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Webhook Events

MakyPay sends real-time notifications for:

### collection.completed
```json
{
  "event_type": "collection.completed",
  "transaction": {
    "uuid": "abc123...",
    "reference": "your-uuid-v4",
    "status": "completed",
    "amount": {
      "formatted": "10,000.00",
      "raw": 10000,
      "currency": "UGX"
    }
  },
  "collection": {
    "provider": "mtn",
    "phone_number": "+256771234567",
    "provider_reference": "mtn-txn-id"
  }
}
```

### collection.failed
```json
{
  "event_type": "collection.failed",
  "transaction": {
    "uuid": "abc123...",
    "status": "failed"
  }
}
```

## Testing

### Sandbox Mode

MakyPay provides a sandbox environment for testing. Contact MakyPay support to enable sandbox mode for your account.

In sandbox:
- No real money is processed
- Use any amount between 500 - 10,000,000 UGX
- Responses are simulated

### Test Phone Numbers

Use real phone numbers in sandbox mode - they won't be charged.

## Security Best Practices

1. **Never expose API credentials** in client-side code
2. **Use environment variables** for all sensitive data
3. **Enable webhook signature verification** (if supported)
4. **Validate all webhook payloads** before processing
5. **Use HTTPS** for all API calls and webhooks
6. **Implement rate limiting** on your API routes
7. **Log all transactions** for audit trails

## Troubleshooting

### 401 Unauthorized
- Check that `MAKYPAY_BASE64_AUTH` or `MAKYPAY_API_KEY` + `MAKYPAY_API_SECRET` are set correctly
- Verify credentials in MakyPay dashboard

### Invalid Phone Number
- Ensure format is `256XXXXXXXXX` (12 digits)
- Check that prefix matches supported providers (MTN: 77,78,76,39 | Airtel: 70,74,75)

### Transaction Timeout
- Mobile money transactions can take 1-2 minutes
- User must approve on their phone
- Implement proper polling with exponential backoff

### Duplicate Reference Error
- Each transaction requires a unique UUID v4 reference
- Don't reuse references for different transactions

## Support

- **MakyPay Documentation:** [https://wire-api.makylegacy.com/docs](https://wire-api.makylegacy.com/docs)
- **MakyPay Support:** Contact through your dashboard
- **Integration Issues:** Check logs in `/api/makypay/*` routes

## Migration from YoPayments

If you're migrating from YoPayments:

1. Both services are supported simultaneously
2. Update payment UI to let users choose provider
3. MakyPay has similar API structure for easy migration
4. Transaction tables are separate (`yopayments_transactions` vs `makypay_transactions`)

## Additional Features

### Get Account Balance
```typescript
const balance = await MakyPayService.getBalance();
console.log('Available:', balance.data.balance.formatted);
```

### Transaction History
```typescript
const history = await MakyPayService.getTransactionHistory(userId);
console.log('Transactions:', history);
```

### Provider Detection
```typescript
const provider = MakyPayService.getProviderFromPhone('0771234567');
console.log('Provider:', provider); // 'mtn'
```

## License

This integration is part of your application. Refer to MakyPay's terms of service for API usage terms.
