# MakyPay Quick Start Guide

Get MakyPay integrated in 5 minutes!

## Step 1: Get Your API Credentials (2 minutes)

1. Go to [MakyPay Dashboard](https://wire-api.makylegacy.com)
2. Navigate to **Developers → API Keys**
3. Copy your **Base64 Authorization Header** (easiest option!)

## Step 2: Add to Environment Variables (1 minute)

Add to your `.env` file:

```bash
MAKYPAY_BASE64_AUTH=your_base64_authorization_header_here
```

## Step 3: Create Database Table (1 minute)

Run this in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of database/makypay_transactions.sql
```

Or use the Supabase CLI:
```bash
supabase db push database/makypay_transactions.sql
```

## Step 4: Test the Integration (1 minute)

### Test Mobile Money Payment

```typescript
// In your payment page or API route
import { MakyPayService } from '@/lib/makypay';

const result = await MakyPayService.collectMobileMoney({
  userId: 'user-id',
  phoneNumber: '0771234567',
  amount: 1000, // 1,000 UGX
  description: 'Test payment',
});

console.log('Transaction ID:', result.uuid);
console.log('Status:', result.status);
```

### Test via API Route

```bash
curl -X POST http://localhost:3000/api/makypay/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "phoneNumber": "0771234567",
    "amount": 1000,
    "description": "Test payment"
  }'
```

## Step 5: Update Your Payment UI (Optional)

Add MakyPay as a payment option in your existing payment page:

```typescript
// In your payment component
const handleMakyPayPayment = async () => {
  const response = await fetch('/api/makypay/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      phoneNumber: phoneNumber,
      amount: selectedPlan.amount,
      description: `Subscription: ${selectedPlan.name}`,
    }),
  });

  const data = await response.json();
  
  if (data.success) {
    // Poll for status
    const statusResponse = await fetch('/api/makypay/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: data.transaction.uuid,
      }),
    });
    
    const statusData = await statusResponse.json();
    
    if (statusData.transaction.isCompleted) {
      // Complete subscription
      await fetch('/api/makypay/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          transactionId: data.transaction.uuid,
          subscriptionPlan: selectedPlan.name,
          subscriptionDuration: selectedPlan.duration_in_days,
        }),
      });
      
      alert('Payment successful!');
    }
  }
};
```

## That's It! 🎉

You now have MakyPay integrated and ready to accept payments!

## Next Steps

- **Setup Webhooks:** Configure webhook URL in MakyPay dashboard for real-time updates
- **Add Card Payments:** Use `paymentMethod: 'card'` in initiate request
- **Customize UI:** Update your payment page to show MakyPay as an option
- **Test in Production:** Use real phone numbers with small amounts

## Common Issues

### "API credentials not configured"
- Make sure `MAKYPAY_BASE64_AUTH` is in your `.env` file
- Restart your development server after adding env variables

### "Invalid phone number format"
- Use format: `0771234567` or `256771234567`
- Supported prefixes: MTN (77,78,76,39), Airtel (70,74,75)

### "Transaction timeout"
- User must approve payment on their phone
- Can take 1-2 minutes
- Implement proper polling (already done in `/api/makypay/status`)

## Support

Need help? Check the full documentation:
- [Complete Integration Guide](./MAKYPAY_INTEGRATION.md)
- [MakyPay API Docs](https://wire-api.makylegacy.com/docs)

## Testing Checklist

- [ ] Environment variables configured
- [ ] Database table created
- [ ] Test mobile money payment (MTN)
- [ ] Test mobile money payment (Airtel)
- [ ] Test card payment (optional)
- [ ] Webhook configured (optional)
- [ ] Production credentials added
- [ ] UI updated with MakyPay option

Happy coding! 🚀
