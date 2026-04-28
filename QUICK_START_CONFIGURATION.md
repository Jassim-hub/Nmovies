# 🚀 Quick Start: Payment Provider Configuration

## TL;DR

**Current Setup:** MakyPay only (YoPayments disabled but code preserved)

**To change:** Edit `lib/payment-config.ts` and restart server.

---

## 📍 Current Configuration

```typescript
// lib/payment-config.ts
export const PAYMENT_CONFIG = {
  YOPAYMENTS_ENABLED: false,  // ❌ Disabled
  MAKYPAY_ENABLED: true,       // ✅ Enabled
} as const;
```

**Result:** Users see only MakyPay in the payment UI.

---

## 🔧 How to Change

### Option 1: MakyPay Only (Current) ✅
```typescript
YOPAYMENTS_ENABLED: false,
MAKYPAY_ENABLED: true,
```
👉 Only MakyPay visible

### Option 2: YoPayments Only
```typescript
YOPAYMENTS_ENABLED: true,
MAKYPAY_ENABLED: false,
```
👉 Only YoPayments visible

### Option 3: Both Providers
```typescript
YOPAYMENTS_ENABLED: true,
MAKYPAY_ENABLED: true,
```
👉 Users can choose

---

## 📝 Steps to Change

1. **Open file:**
   ```bash
   code lib/payment-config.ts
   ```

2. **Change values:**
   ```typescript
   YOPAYMENTS_ENABLED: true,  // or false
   MAKYPAY_ENABLED: true,      // or false
   ```

3. **Restart server:**
   ```bash
   npm run dev
   ```

4. **Done!** ✅

---

## 🎯 What Happens

### When ENABLED ✅
- Appears in payment UI
- API accepts requests
- Users can pay

### When DISABLED ❌
- Hidden from UI
- API returns "disabled" message
- Code preserved (not deleted)

---

## 📊 Visual Guide

### Current State (MakyPay Only)
```
┌─────────────────────────┐
│    Payment Page         │
├─────────────────────────┤
│                         │
│  ✅ MakyPay             │
│     • Mobile Money      │
│     • Card Payments     │
│                         │
│  ❌ YoPayments          │
│     (Hidden)            │
│                         │
└─────────────────────────┘
```

### If Both Enabled
```
┌─────────────────────────┐
│    Payment Page         │
├─────────────────────────┤
│                         │
│  ✅ MakyPay             │
│     • Mobile Money      │
│     • Card Payments     │
│                         │
│  ✅ YoPayments          │
│     • Mobile Money      │
│                         │
└─────────────────────────┘
```

---

## 🧪 Quick Test

### Test Current Setup (MakyPay Only)

1. **Visit payment page:**
   ```
   http://localhost:3000/payment
   ```

2. **Expected:**
   - ✅ See MakyPay option
   - ❌ Don't see YoPayments

3. **Try YoPayments API:**
   ```bash
   curl -X POST http://localhost:3000/api/yopayments/initiate
   ```
   
4. **Expected Response:**
   ```json
   {
     "error": "YoPayments is currently disabled.",
     "success": false
   }
   ```

---

## 📚 Full Documentation

- **Complete Guide:** `docs/PAYMENT_CONFIGURATION.md`
- **MakyPay Setup:** `docs/MAKYPAY_INTEGRATION.md`
- **Configuration Summary:** `CONFIGURATION_COMPLETE.md`

---

## ⚡ Common Tasks

### Enable YoPayments
```typescript
// lib/payment-config.ts
YOPAYMENTS_ENABLED: true,
```
Then restart: `npm run dev`

### Disable MakyPay
```typescript
// lib/payment-config.ts
MAKYPAY_ENABLED: false,
```
Then restart: `npm run dev`

### Check Status in Code
```typescript
import { PaymentProviders } from '@/lib/payment-config';

PaymentProviders.isYoPaymentsEnabled()  // false
PaymentProviders.isMakyPayEnabled()     // true
PaymentProviders.getDefaultProvider()   // 'makypay'
```

---

## ❓ FAQ

### Q: Will I lose YoPayments data?
**A:** No! All code and data is preserved. Just hidden from UI.

### Q: Can I re-enable YoPayments later?
**A:** Yes! Just change config to `true` and restart.

### Q: Do I need environment variables?
**A:** No! Configuration is code-based in `lib/payment-config.ts`.

### Q: What if I disable both?
**A:** Payment page will show error. Not recommended.

### Q: Do I need to update database?
**A:** No! Database tables remain unchanged.

---

## ✅ Checklist

- [x] Configuration file created
- [x] YoPayments disabled
- [x] MakyPay enabled
- [x] API routes updated
- [x] Payment page updated
- [x] Documentation complete
- [x] No errors
- [x] Ready to use

---

## 🎉 You're All Set!

**Current Status:**
- ✅ MakyPay: Active
- ❌ YoPayments: Disabled (code preserved)

**To change:** Edit `lib/payment-config.ts`

**Questions?** Check `docs/PAYMENT_CONFIGURATION.md`

---

**Last Updated:** [Current Date]  
**Status:** ✅ Production Ready
