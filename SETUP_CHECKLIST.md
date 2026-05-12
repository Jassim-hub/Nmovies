# 🚀 Quick Setup Checklist

Follow these steps to get all new features working:

## ✅ Step 1: Database Migration

Run the enhanced view logs migration in Supabase SQL Editor:

```sql
-- Copy and paste the contents of:
-- database/migrations/20260512_enhance_view_logs.sql
```

**Verify:**
- [ ] `view_logs_enhanced` table created
- [ ] All indexes created successfully
- [ ] Analytics functions available

## ✅ Step 2: Environment Variables

Add to your `.env` file:

```env
# Generate a strong secret: openssl rand -hex 32
VIDEO_SECRET=your-super-secret-key-here

# Your production domain
NEXT_PUBLIC_APP_DOMAIN=streamit.com
```

**Verify:**
- [ ] VIDEO_SECRET is set (not the default)
- [ ] NEXT_PUBLIC_APP_DOMAIN matches your domain
- [ ] Restart your dev server after adding variables

## ✅ Step 3: Test Share Button

1. Navigate to any movie or series detail page
2. Look for the share button (next to download)
3. Click it and test:
   - [ ] Modal opens with social platforms
   - [ ] Copy link works
   - [ ] On mobile: native share dialog appears

## ✅ Step 4: Test Watchlist

1. Navigate to `/watchlist`
2. Verify:
   - [ ] Page loads without errors
   - [ ] Shows empty state if no items
   - [ ] Add items from detail pages
   - [ ] Filter tabs work (All, Movies, Series)
   - [ ] Remove button works

## ✅ Step 5: Test Video Protection

### Generate a Protected URL:

```typescript
import { generateProtectedVideoUrl } from '@/lib/video-protection';

const protectedUrl = generateProtectedVideoUrl(
  '/api/protected-stream',
  'test-video-id',
  user?.id
);

console.log('Protected URL:', protectedUrl);
```

### Test Protection:

1. Try accessing video without token:
   - [ ] Should return 403 error

2. Try accessing with valid token:
   - [ ] Video should play

3. Try accessing from external site:
   - [ ] Should return "Invalid referrer" error

## ✅ Step 6: Mobile Testing

Test on mobile device or browser dev tools:

1. Movie/Series Detail Pages:
   - [ ] Download and Share buttons on same line
   - [ ] Buttons are touch-friendly
   - [ ] Share uses native dialog

2. Watchlist Page:
   - [ ] Grid layout responsive
   - [ ] Filter tabs work
   - [ ] Cards display correctly

## ✅ Step 7: Integration (Optional)

### Add Watchlist to Navigation:

```tsx
// In your navigation component
<Link href="/watchlist">
  <Button>My Watchlist</Button>
</Link>
```

### Protect Existing Videos:

Update your video player components to use protected URLs:

```typescript
import { generateVideoToken } from '@/lib/video-protection';

// Generate token
const token = generateVideoToken(movie.id, user?.id);

// Use protected endpoint
const videoUrl = `/api/protected-stream?url=${encodeURIComponent(movie.video_url)}&token=${token}`;
```

## ✅ Step 8: Production Checklist

Before deploying to production:

- [ ] Changed VIDEO_SECRET from default
- [ ] Set correct NEXT_PUBLIC_APP_DOMAIN
- [ ] Tested all features in staging
- [ ] Verified video protection works
- [ ] Tested on multiple devices
- [ ] Checked browser console for errors
- [ ] Reviewed server logs
- [ ] Consider implementing Redis for rate limiting
- [ ] Set up monitoring for failed auth attempts

## 🔍 Troubleshooting

### Share Button Not Working
- Check browser console for errors
- Verify ShareButton component is imported
- Test on different browsers

### Watchlist Page 404
- Verify file exists at `app/watchlist/page.tsx`
- Check Next.js routing
- Restart dev server

### Video Protection Errors

**"Invalid referrer":**
- Check NEXT_PUBLIC_APP_DOMAIN is set
- Verify domain matches your site
- Test from correct domain

**"Token expired":**
- Tokens expire after 1 hour
- Regenerate token
- Increase expiry time if needed

**"Rate limit exceeded":**
- Adjust rate limits in code
- Implement Redis for production
- Whitelist trusted IPs

### Videos Not Playing
- Check VIDEO_SECRET is set
- Verify token generation
- Check browser network tab
- Review server logs

## 📊 Verify Analytics

Test the new analytics functions:

```sql
-- In Supabase SQL Editor

-- Top content today
SELECT * FROM get_top_content_by_date_range(
  CURRENT_DATE,
  CURRENT_DATE,
  'all',
  10
);

-- Device stats (last 30 days)
SELECT * FROM get_device_statistics();

-- Geographic stats
SELECT * FROM get_geographic_statistics();
```

## 🎯 Quick Test Script

Run this in your browser console on a detail page:

```javascript
// Test share button
document.querySelector('[aria-label="Share"]')?.click();

// Test watchlist
console.log('Watchlist URL:', window.location.origin + '/watchlist');

// Test video protection
fetch('/api/protected-stream?url=test')
  .then(r => console.log('Protection test:', r.status === 403 ? '✅ Working' : '❌ Not working'));
```

## ✨ Success Indicators

You'll know everything is working when:

1. ✅ Share button appears on all detail pages
2. ✅ Share modal opens with 6 social platforms
3. ✅ Watchlist page loads at `/watchlist`
4. ✅ Videos require tokens to play
5. ✅ Direct video URLs are blocked
6. ✅ Mobile layout looks perfect
7. ✅ No console errors
8. ✅ Analytics functions return data

## 📚 Next Steps

After setup is complete:

1. Read `docs/IMPLEMENTATION_SUMMARY.md` for details
2. Review `docs/VIDEO_PROTECTION_GUIDE.md` for advanced usage
3. Implement remaining features (admin dashboard, filters, etc.)
4. Customize styling to match your brand
5. Set up monitoring and analytics

## 🆘 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review documentation in `docs/` folder
3. Check inline code comments
4. Verify environment variables
5. Test in incognito/private mode
6. Check browser and server logs

---

**Estimated Setup Time:** 15-30 minutes

**Difficulty:** Easy to Moderate

**Prerequisites:** 
- Supabase access
- Next.js knowledge
- Basic understanding of environment variables

Good luck! 🚀
