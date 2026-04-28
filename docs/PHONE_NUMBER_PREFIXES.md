# Uganda Mobile Money Phone Number Prefixes

Complete reference for MTN and Airtel mobile money phone number prefixes in Uganda.

## Overview

This document lists all valid phone number prefixes for mobile money providers in Uganda. The system automatically detects the provider based on the phone number prefix.

## MTN Mobile Money

### All MTN Prefixes (as of March 2025)

| Prefix | Status | Notes |
|--------|--------|-------|
| **077** | ✅ Active | Original MTN prefix |
| **078** | ✅ Active | Original MTN prefix |
| **076** | ✅ Active | Introduced in 2021 |
| **039** | ✅ Active | MTN prefix |
| **031** | ✅ Active | MTN prefix |
| **079** | ✅ Active | **Newly added March 2025** |

### Format Examples
```
0770123456  → MTN
0780123456  → MTN
0760123456  → MTN
0390123456  → MTN
0310123456  → MTN
0790123456  → MTN (New!)
```

### International Format
```
256770123456  → MTN
256780123456  → MTN
256760123456  → MTN
256390123456  → MTN
256310123456  → MTN
256790123456  → MTN (New!)
```

## Airtel Money

### All Airtel Prefixes

| Prefix | Status | Notes |
|--------|--------|-------|
| **070** | ✅ Active | Primary Airtel prefix |
| **074** | ✅ Active | Airtel prefix |
| **075** | ✅ Active | Airtel prefix |

### Format Examples
```
0700123456  → Airtel
0740123456  → Airtel
0750123456  → Airtel
```

### International Format
```
256700123456  → Airtel
256740123456  → Airtel
256750123456  → Airtel
```

## Implementation

### MakyPay Service

```typescript
// lib/makypay.ts
static getProviderFromPhone(phoneNumber: string): string {
  const formatted = this.formatPhoneNumber(phoneNumber);

  // MTN: 256 + (077, 078, 076, 039, 031, 079)
  if (/^256(77|78|76|39|31|79)/.test(formatted)) {
    return 'mtn';
  }

  // Airtel: 256 + (070, 074, 075)
  if (/^256(70|74|75)/.test(formatted)) {
    return 'airtel';
  }

  // Default to MTN if unknown
  return 'mtn';
}
```

### YoPayments Service

```typescript
// lib/yopayments.ts
static getAccountProviderCode(phoneNumber: string): string {
  const formatted = this.formatPhoneNumber(phoneNumber);

  // MTN: 256 + (077, 078, 076, 039, 031, 079)
  if (/^256(77|78|76|39|31|79)/.test(formatted)) {
    return 'MTN_MOMO_UGA';
  }

  // Airtel: 256 + (070, 074, 075)
  if (/^256(70|74|75)/.test(formatted)) {
    return 'AIRTEL_OAPI_UGA';
  }

  // Default to MTN if unknown
  return 'MTN_MOMO_UGA';
}
```

## Phone Number Formats

### Accepted Input Formats

All these formats are automatically converted to the standard format:

```typescript
// Local format (with leading 0)
0770123456
0780123456
0760123456
0390123456
0310123456
0790123456
0700123456
0740123456
0750123456

// International format (without +)
256770123456
256780123456
256760123456
256390123456
256310123456
256790123456
256700123456
256740123456
256750123456

// International format (with +)
+256770123456
+256780123456
+256760123456
+256390123456
+256310123456
+256790123456
+256700123456
+256740123456
+256750123456
```

### Standard Format (Internal)

All phone numbers are converted to this format internally:

```
256XXXXXXXXX (12 digits total)
```

Example: `256770123456`

## Validation

### Valid Phone Numbers

```typescript
// MTN
✅ 0770123456  → Valid MTN
✅ 0780123456  → Valid MTN
✅ 0760123456  → Valid MTN
✅ 0390123456  → Valid MTN
✅ 0310123456  → Valid MTN
✅ 0790123456  → Valid MTN (New!)

// Airtel
✅ 0700123456  → Valid Airtel
✅ 0740123456  → Valid Airtel
✅ 0750123456  → Valid Airtel
```

### Invalid Phone Numbers

```typescript
❌ 0710123456  → Invalid (not MTN or Airtel)
❌ 0720123456  → Invalid (not MTN or Airtel)
❌ 0730123456  → Invalid (not MTN or Airtel)
❌ 077012345   → Invalid (too short)
❌ 07701234567 → Invalid (too long)
```

## Testing

### Test Phone Numbers

Use these patterns for testing (replace X with any digit):

```typescript
// MTN Test Numbers
077XXXXXXX  // Original MTN
078XXXXXXX  // Original MTN
076XXXXXXX  // MTN (2021)
039XXXXXXX  // MTN
031XXXXXXX  // MTN
079XXXXXXX  // MTN (March 2025) - NEW!

// Airtel Test Numbers
070XXXXXXX  // Airtel
074XXXXXXX  // Airtel
075XXXXXXX  // Airtel
```

### Test Cases

```typescript
import { MakyPayService } from '@/lib/makypay';

// Test MTN detection
console.log(MakyPayService.getProviderFromPhone('0770123456')); // 'mtn'
console.log(MakyPayService.getProviderFromPhone('0780123456')); // 'mtn'
console.log(MakyPayService.getProviderFromPhone('0760123456')); // 'mtn'
console.log(MakyPayService.getProviderFromPhone('0390123456')); // 'mtn'
console.log(MakyPayService.getProviderFromPhone('0310123456')); // 'mtn'
console.log(MakyPayService.getProviderFromPhone('0790123456')); // 'mtn' ← NEW!

// Test Airtel detection
console.log(MakyPayService.getProviderFromPhone('0700123456')); // 'airtel'
console.log(MakyPayService.getProviderFromPhone('0740123456')); // 'airtel'
console.log(MakyPayService.getProviderFromPhone('0750123456')); // 'airtel'
```

## Updates History

| Date | Change | Prefixes Added |
|------|--------|----------------|
| March 2025 | MTN added new prefix | 079 |
| 2021 | MTN added new prefix | 076 |
| Earlier | Original prefixes | 077, 078, 039, 031, 070, 074, 075 |

## Quick Reference

### MTN Prefixes
```
077, 078, 076, 039, 031, 079
```

### Airtel Prefixes
```
070, 074, 075
```

### Regex Patterns

**MTN Detection:**
```regex
^256(77|78|76|39|31|79)
```

**Airtel Detection:**
```regex
^256(70|74|75)
```

## Common Issues

### Issue: "Invalid number" error
**Cause:** Phone number doesn't match any known prefix  
**Solution:** Verify the prefix is in the list above

### Issue: Wrong provider detected
**Cause:** Prefix not in detection regex  
**Solution:** Check that prefix is included in the regex pattern

### Issue: New prefix not working
**Cause:** Code not updated with new prefix  
**Solution:** Update regex patterns in both services

## Maintenance

### When New Prefixes Are Added

1. **Update MakyPay Service** (`lib/makypay.ts`)
   ```typescript
   if (/^256(77|78|76|39|31|79|XX)/.test(formatted)) {
   //                            ↑ Add new prefix
   ```

2. **Update YoPayments Service** (`lib/yopayments.ts`)
   ```typescript
   if (/^256(77|78|76|39|31|79|XX)/.test(formatted)) {
   //                            ↑ Add new prefix
   ```

3. **Update Documentation**
   - This file
   - `docs/MAKYPAY_INTEGRATION.md`
   - `docs/PAYMENT_PROVIDERS_COMPARISON.md`
   - All README files

4. **Test**
   - Test with new prefix
   - Verify provider detection
   - Check payment flow

## Summary

### Current Supported Prefixes (March 2025)

**MTN Mobile Money:** 077, 078, 076, 039, 031, 079 (6 prefixes)  
**Airtel Money:** 070, 074, 075 (3 prefixes)  
**Total:** 9 prefixes supported

### Latest Update
- **Date:** March 2025
- **Change:** Added MTN prefix 079
- **Status:** ✅ Implemented in both services

---

**Last Updated:** March 2025  
**Status:** ✅ All prefixes current and tested  
**Next Review:** When new prefixes are announced
