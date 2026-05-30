# Realtime Subscription Setup Checklist

## ✅ Code Changes (Already Done)
- [x] Updated `AuthProvider.tsx` with Realtime subscription
- [x] Added `refreshPremiumStatus()` method
- [x] Updated `payment/page.tsx` to call refresh after payment
- [x] Created migration file for enabling Realtime

## 🔧 Supabase Configuration (You Need to Do This)

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Replication**
3. Find the `profiles` table in the list
4. Click the toggle to enable Realtime for `profiles`
5. Verify it shows "Realtime enabled" ✅

### Option 2: Using SQL Editor
1. Go to **SQL Editor** in Supabase Dashboard
2. Run this command:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
   ```
3. Click "Run" to execute

### Option 3: Using Migration File
1. Copy the SQL from `database/migrations/enable_realtime_profiles.sql`
2. Run it in your Supabase SQL Editor

## 🧪 Testing

### Quick Test:
1. Sign in to your app
2. Open browser console (F12)
3. Look for these logs:
   - ✅ "AuthProvider: Setting up realtime subscription for user: [id]"
   - ✅ "AuthProvider: Realtime subscription status: SUBSCRIBED"

### Full Test with Test Component:
1. Add `<RealtimeTest />` to your home page temporarily:
   ```tsx
   import RealtimeTest from '@/components/RealtimeTest';
   
   export default function Home() {
     return (
       <>
         {/* Your existing content */}
         <RealtimeTest />
       </>
     );
   }
   ```
2. Sign in and you'll see a test panel in bottom-right corner
3. Make a payment or manually update subscription in database
4. Watch the test panel for real-time updates

### Payment Flow Test:
1. Go to `/payment` page
2. Select a plan and complete payment
3. Watch browser console for:
   - ✅ "Payment successful - refreshing premium status"
   - ✅ "AuthProvider: Profile updated via realtime"
   - ✅ "AuthProvider: Realtime premium status update"
4. Verify you can access premium content immediately

## 🔍 Verification

### Check if Realtime is Working:
```javascript
// Run this in browser console after signing in
supabase
  .channel('test-channel')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'profiles' },
    (payload) => console.log('Realtime works!', payload)
  )
  .subscribe()
```

### Check Profile Data:
```sql
-- Run in Supabase SQL Editor
SELECT id, subscription, subscription_expiry_date 
FROM profiles 
WHERE id = 'your-user-id';
```

## 🐛 Troubleshooting

### "Realtime not connecting"
- Check if your Supabase project has Realtime enabled (it's enabled by default on all plans)
- Verify your internet connection
- Check browser console for WebSocket errors

### "No updates received"
- Verify Realtime is enabled on `profiles` table (see Configuration above)
- Check RLS policies allow reading profile data
- Ensure subscription data is actually being written to database

### "Still can't access premium content"
- Check `subscription_expiry_date` is in the future
- Verify `subscription` field is not 'free'
- Check browser console for `isPremium` value
- Try manual refresh: `window.location.reload()`

## 📊 Expected Behavior

### Before Fix:
❌ User pays → Subscription updated in DB → User still sees "Subscribe" → Must reload page

### After Fix:
✅ User pays → Subscription updated in DB → Realtime triggers → `isPremium` updates → User sees premium content instantly

## 🎯 Success Criteria

You'll know it's working when:
1. ✅ Console shows "Realtime subscription status: SUBSCRIBED"
2. ✅ After payment, premium access is granted without page reload
3. ✅ Test panel shows real-time updates when subscription changes
4. ✅ Multiple browser tabs update simultaneously

## 📝 Notes

- Realtime is included in all Supabase plans (Free, Pro, Enterprise)
- No additional cost for Realtime on reasonable usage
- Subscriptions are automatically cleaned up on component unmount
- Works across multiple tabs and devices simultaneously
- Respects Row Level Security (RLS) policies

## 🚀 Next Steps

After confirming everything works:
1. Remove `<RealtimeTest />` component from production
2. Monitor logs for any Realtime connection issues
3. Consider adding user-facing notification when subscription activates
4. Optional: Add toast notification on premium access granted
