# Payment Gateway Configuration Guide

This guide explains how to enable/disable payment providers in your application using the configuration system.

## Overview

Your application supports two payment providers:
- **YoPayments** - Mobile Money (MTN & Airtel)
- **MakyPay** - Mobile Money (MTN & Airtel) + Card Payments

You can enable or disable either provider using a simple configuration file.

## Configuration File

Location: `lib/payment-config.ts`

```typescript
export const PAYMENT_CONFIG = {
  /**
   * YoPayments - Mobile Money (MTN & Airtel)
   * Set to false to disable YoPayments throughout the application
   */
  YOPAYMENTS_ENABLED: false,  // ← Change this

  /**
   * MakyPay - Mobile Money (MTN & Airtel) + Card Payments
   * Set to false to disable MakyPay throughout the application
   */
  MAKYPAY_ENABLED: true,      // ← Change this
} as const;
```

## Current Configuration

**Default Setup:**
- ✅ **MakyPay:** ENABLED (Primary payment provider)
- ❌ **YoPayments:** DISABLED (Code preserved, not visible in UI)

## How It Works

### When a Provider is ENABLED
- ✅ Appears in the payment UI
- ✅ API routes accept requests
- ✅ Users can make payments
- ✅ Transactions are processed

### When a Provider is DISABLED
- ❌ Hidden from all UI components
- ❌ API routes return "disabled" message
- ✅ Code remains intact (not deleted)
- ✅ Database tables remain (historical data preserved)
- ✅ Can be re-enabled anytime

## Configuration Scenarios

### Scenario 1: MakyPay Only (Current Setup)
```typescript
YOPAYMENTS_ENABLED: false,
MAKYPAY_ENABLED: true,
```
**Result:** Only MakyPay appears in UI. Users pay via MakyPay.

### Scenario 2: YoPayments Only
```typescript
YOPAYMENTS_ENABLED: true,
MAKYPAY_ENABLED: false,
```
**Result:** Only YoPayments appears in UI. Users pay via YoPayments.

### Scenario 3: Both Providers
```typescript
YOPAYMENTS_ENABLED: true,
MAKYPAY_ENABLED: true,
```
**Result:** Both providers available. Users can choose their preferred method.

### Scenario 4: No Providers (Not Recommended)
```typescript
YOPAYMENTS_ENABLED: false,
MAKYPAY_ENABLED: false,
```
**Result:** No payment options available. Payment page will show error.

## How to Change Configuration

### Step 1: Open Configuration File
```bash
# Open in your editor
code lib/payment-config.ts
```

### Step 2: Update Values
```typescript
export const PAYMENT_CONFIG = {
  YOPAYMENTS_ENABLED: true,   // Change to true to enable
  MAKYPAY_ENABLED: true,       // Change to false to disable
} as const;
```

### Step 3: Restart Development Server
```bash
# Stop the server (Ctrl+C)
# Start it again
npm run dev
```

### Step 4: Verify Changes
- Visit the payment page
- Check which providers appear
- Test payment flow

## API Route Behavior

### When Provider is Disabled

**Request:**
```bash
POST /api/yopayments/initiate
```

**Response (503 Service Unavailable):**
```json
{
  "error": "YoPayments is currently disabled. Please use an alternative payment method.",
  "success": false
}
```

### When Provider is Enabled

**Request:**
```bash
POST /api/makypay/initiate
```

**Response (200 OK):**
```json
{
  "success": true,
  "transaction": {
    "uuid": "...",
    "status": "processing"
  }
}
```

## UI Behavior

### Payment Page (`app/payment/page.tsx`)

The payment page automatically adapts based on configuration:

```typescript
// Detects which provider is enabled
if (PaymentProviders.isMakyPayEnabled()) {
  // Use MakyPay
  const provider = MakyPayService.getProviderFromPhone(phoneNumber);
} else if (PaymentProviders.isYoPaymentsEnabled()) {
  // Use YoPayments
  const mno = YoPaymentsService.getAccountProviderCode(phoneNumber);
}
```

### Helper Functions

```typescript
import { PaymentProviders } from '@/lib/payment-config';

// Check if YoPayments is enabled
if (PaymentProviders.isYoPaymentsEnabled()) {
  // Show YoPayments option
}

// Check if MakyPay is enabled
if (PaymentProviders.isMakyPayEnabled()) {
  // Show MakyPay option
}

// Get list of enabled providers
const providers = PaymentProviders.getEnabledProviders();
// Returns: ['makypay'] or ['yopayments'] or ['yopayments', 'makypay']

// Get default provider
const defaultProvider = PaymentProviders.getDefaultProvider();
// Returns: 'makypay' or 'yopayments' or null
```

## Code Preservation

### Why Keep Disabled Code?

1. **Easy Re-enabling:** Just flip the config flag
2. **Historical Data:** Transaction records remain accessible
3. **Testing:** Can test both providers in development
4. **Migration:** Gradual transition between providers
5. **Backup:** Fallback option if primary provider has issues

### What's Preserved When Disabled?

- ✅ Service library (`lib/yopayments.ts`)
- ✅ API routes (`app/api/yopayments/*`)
- ✅ Database tables (`yopayments_transactions`)
- ✅ Transaction history
- ✅ All functionality (just not accessible)

## Migration Guide

### From YoPayments to MakyPay

**Phase 1: Add MakyPay (Both Enabled)**
```typescript
YOPAYMENTS_ENABLED: true,
MAKYPAY_ENABLED: true,
```
- Users can choose either provider
- Test MakyPay thoroughly
- Monitor both providers

**Phase 2: Disable YoPayments (MakyPay Only)**
```typescript
YOPAYMENTS_ENABLED: false,
MAKYPAY_ENABLED: true,
```
- Only MakyPay visible
- YoPayments code preserved
- Can re-enable if needed

### From MakyPay to YoPayments

**Reverse the process:**
```typescript
YOPAYMENTS_ENABLED: true,
MAKYPAY_ENABLED: false,
```

## Environment-Specific Configuration

### Development
```typescript
// lib/payment-config.ts
export const PAYMENT_CONFIG = {
  YOPAYMENTS_ENABLED: true,   // Test both
  MAKYPAY_ENABLED: true,       // Test both
} as const;
```

### Production
```typescript
// lib/payment-config.ts
export const PAYMENT_CONFIG = {
  YOPAYMENTS_ENABLED: false,  // Only MakyPay
  MAKYPAY_ENABLED: true,       // Primary provider
} as const;
```

## Advanced: Environment Variable Override (Optional)

If you want to control this via environment variables:

```typescript
// lib/payment-config.ts
export const PAYMENT_CONFIG = {
  YOPAYMENTS_ENABLED: process.env.NEXT_PUBLIC_YOPAYMENTS_ENABLED === 'true',
  MAKYPAY_ENABLED: process.env.NEXT_PUBLIC_MAKYPAY_ENABLED !== 'false', // Default true
} as const;
```

Then in `.env`:
```bash
NEXT_PUBLIC_YOPAYMENTS_ENABLED=false
NEXT_PUBLIC_MAKYPAY_ENABLED=true
```

**Note:** Current implementation uses code-based config (no env variables needed).

## Troubleshooting

### Provider Not Appearing in UI

**Check:**
1. Configuration value is `true`
2. Development server was restarted
3. No TypeScript errors
4. Browser cache cleared

### API Returns "Disabled" Error

**Solution:**
1. Open `lib/payment-config.ts`
2. Set provider to `true`
3. Restart server
4. Try again

### Both Providers Showing (Want Only One)

**Solution:**
1. Set unwanted provider to `false`
2. Restart server
3. Verify in UI

## Best Practices

### 1. Document Changes
```typescript
// Changed on 2024-01-15: Disabled YoPayments, using MakyPay only
export const PAYMENT_CONFIG = {
  YOPAYMENTS_ENABLED: false,
  MAKYPAY_ENABLED: true,
} as const;
```

### 2. Test Before Deploying
- Test payment flow with enabled provider
- Verify disabled provider doesn't appear
- Check API routes return correct responses

### 3. Monitor After Changes
- Watch for payment errors
- Check transaction success rates
- Monitor user feedback

### 4. Keep Code Clean
- Don't delete disabled provider code
- Keep imports (they're tree-shaken if unused)
- Maintain both database tables

## Summary

### Current Setup
- ✅ **MakyPay:** Active and visible
- ❌ **YoPayments:** Disabled but code preserved

### To Enable YoPayments
```typescript
YOPAYMENTS_ENABLED: true,
```

### To Disable MakyPay
```typescript
MAKYPAY_ENABLED: false,
```

### To Enable Both
```typescript
YOPAYMENTS_ENABLED: true,
MAKYPAY_ENABLED: true,
```

## Quick Reference

| Action | Configuration |
|--------|--------------|
| MakyPay only (current) | `YOPAYMENTS_ENABLED: false, MAKYPAY_ENABLED: true` |
| YoPayments only | `YOPAYMENTS_ENABLED: true, MAKYPAY_ENABLED: false` |
| Both providers | `YOPAYMENTS_ENABLED: true, MAKYPAY_ENABLED: true` |
| Neither (error) | `YOPAYMENTS_ENABLED: false, MAKYPAY_ENABLED: false` |

---

**Configuration File:** `lib/payment-config.ts`  
**Last Updated:** [Current Date]  
**Current Status:** MakyPay Only (YoPayments Disabled)
