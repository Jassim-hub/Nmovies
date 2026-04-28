# MakyPay Setup Checklist

Use this checklist to ensure your MakyPay integration is properly configured.

## ✅ Pre-Setup

- [ ] I have a MakyPay account
- [ ] I have access to the MakyPay dashboard
- [ ] I have access to my Supabase database
- [ ] I have access to my `.env` file

## 📋 Setup Steps

### 1. API Credentials
- [ ] Logged into MakyPay dashboard
- [ ] Navigated to Developers → API Keys
- [ ] Copied Base64 Authorization Header (or API Key + Secret)
- [ ] Added credentials to `.env` file:
  ```bash
  MAKYPAY_BASE64_AUTH=your_base64_authorization_header
  ```
- [ ] Restarted development server after adding env variables

### 2. Database Setup
- [ ] Opened Supabase SQL Editor
- [ ] Copied contents of `database/makypay_transactions.sql`
- [ ] Executed SQL in Supabase
- [ ] Verified `makypay_transactions` table was created
- [ ] Checked that RLS policies are enabled
- [ ] Verified indexes were created

### 3. File Verification
Confirm all files are in place:
- [ ] `lib/makypay.ts` exists
- [ ] `app/api/makypay/initiate/route.ts` exists
- [ ] `app/api/makypay/status/route.ts` exists
- [ ] `app/api/makypay/complete/route.ts` exists
- [ ] `app/api/makypay/webhook/route.ts` exists
- [ ] `components/MakyPayButton.tsx` exists
- [ ] `database/makypay_transactions.sql` exists

### 4. Environment Variables Check
Verify all required variables are set:
- [ ] `MAKYPAY_BASE64_AUTH` (or `MAKYPAY_API_KEY` + `MAKYPAY_API_SECRET`)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

## 🧪 Testing

### Basic Tests
- [ ] Development server starts without errors
- [ ] No TypeScript compilation errors
- [ ] API routes are accessible

### Payment Tests

#### MTN Mobile Money
- [ ] Can initiate MTN payment (prefix 77, 78, 76, or 39)
- [ ] Receive payment prompt on phone
- [ ] Can approve payment
- [ ] Transaction status updates to "completed"
- [ ] Subscription is activated
- [ ] Transaction appears in database

#### Airtel Money
- [ ] Can initiate Airtel payment (prefix 70, 74, or 75)
- [ ] Receive payment prompt on phone
- [ ] Can approve payment
- [ ] Transaction status updates to "completed"
- [ ] Subscription is activated
- [ ] Transaction appears in database

#### Card Payment (Optional)
- [ ] Can initiate card payment
- [ ] Redirected to payment gateway
- [ ] Can complete card payment
- [ ] Webhook receives completion notification
- [ ] Subscription is activated

### Error Handling Tests
- [ ] Invalid phone number shows error
- [ ] Insufficient balance shows error
- [ ] Cancelled payment shows error
- [ ] Timeout is handled gracefully

## 🔧 Integration

### UI Integration
- [ ] Decided where to add MakyPay option
- [ ] Added `MakyPayButton` component to payment page
- [ ] OR integrated with existing payment flow
- [ ] Tested payment flow from UI
- [ ] Added loading states
- [ ] Added success/error messages

### Webhook Configuration (Optional but Recommended)
- [ ] Deployed application to production/staging
- [ ] Noted webhook URL: `https://yourdomain.com/api/makypay/webhook`
- [ ] Logged into MakyPay dashboard
- [ ] Navigated to Settings → Webhooks
- [ ] Added webhook URL
- [ ] Selected events:
  - [ ] `collection.completed`
  - [ ] `collection.failed`
  - [ ] `collection.cancelled`
- [ ] Tested webhook reception
- [ ] Verified webhook updates database

## 📊 Monitoring

### Logging
- [ ] API routes log requests and responses
- [ ] Errors are logged with details
- [ ] Transaction status changes are logged
- [ ] Webhook events are logged

### Database
- [ ] Can query `makypay_transactions` table
- [ ] Transactions have correct status
- [ ] User IDs are properly linked
- [ ] Timestamps are accurate

## 🚀 Production Deployment

### Pre-Deployment
- [ ] All tests pass in development
- [ ] Environment variables are set in production
- [ ] Database migration is applied to production
- [ ] Webhook URL is configured (if using)
- [ ] Error monitoring is set up

### Post-Deployment
- [ ] Test with real transaction (small amount)
- [ ] Verify payment completes successfully
- [ ] Check subscription is activated
- [ ] Monitor logs for errors
- [ ] Test webhook reception (if configured)

## 📚 Documentation Review

- [ ] Read `docs/MAKYPAY_QUICKSTART.md`
- [ ] Read `docs/MAKYPAY_INTEGRATION.md`
- [ ] Understand payment flow
- [ ] Know how to check transaction status
- [ ] Know how to handle errors
- [ ] Understand webhook events

## 🔐 Security Review

- [ ] API credentials are in environment variables (not hardcoded)
- [ ] `.env` file is in `.gitignore`
- [ ] RLS policies are enabled on database table
- [ ] User authentication is validated in API routes
- [ ] Webhook endpoint validates payloads
- [ ] HTTPS is used for all API calls
- [ ] Sensitive data is not logged

## 💡 Optional Enhancements

- [ ] Add transaction history page
- [ ] Add payment analytics
- [ ] Add admin dashboard for transactions
- [ ] Implement refund functionality
- [ ] Add email notifications for payments
- [ ] Add SMS notifications for payments
- [ ] Create payment receipts
- [ ] Add payment retry logic

## 📞 Support Resources

- [ ] Bookmarked MakyPay documentation
- [ ] Saved MakyPay support contact
- [ ] Know where to check API logs
- [ ] Know where to check database logs
- [ ] Have access to error monitoring

## ✨ Final Checks

- [ ] All checklist items above are completed
- [ ] Application is running without errors
- [ ] Payments are working correctly
- [ ] Subscriptions are being activated
- [ ] Users can successfully subscribe
- [ ] Ready for production use

---

## 🎉 Completion

Once all items are checked:
- ✅ Your MakyPay integration is complete!
- ✅ You're ready to accept payments!
- ✅ Users can subscribe using mobile money or cards!

**Congratulations!** 🚀

---

## 📝 Notes

Use this space to track any issues or customizations:

```
Date: _______________
Issues encountered:


Solutions applied:


Custom modifications:


```

---

## 🆘 Need Help?

If you encounter issues:

1. Check the logs in `/api/makypay/*` routes
2. Review `docs/MAKYPAY_INTEGRATION.md`
3. Verify environment variables are set correctly
4. Check database table exists and has correct schema
5. Test with MakyPay sandbox mode first
6. Contact MakyPay support through dashboard

---

**Last Updated:** [Date of integration]
**Integration Version:** 1.0.0
**Status:** ⬜ In Progress | ⬜ Testing | ⬜ Production Ready
