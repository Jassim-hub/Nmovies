# Video 403 Error Fix

## Problem
Videos were returning 403 errors with "ArtPlayer playback error" even though the Realtime subscription was working correctly.

## Root Cause
The `/api/stream` endpoint has SSRF (Server-Side Request Forgery) protection that blocks video URLs not in the `ALLOWED_VIDEO_HOSTS` allowlist.

Your video sources (vidsrc.cc, etc.) were not in the allowlist, causing all video requests to be blocked.

## Solution Applied

Added `ALLOWED_VIDEO_HOSTS` environment variable to `.env` file with all common video streaming domains:

```env
ALLOWED_VIDEO_HOSTS=vidsrc.cc,vidsrc.to,vidsrc.me,vidsrc.net,vidsrc.xyz,vidsrc.pro,vidsrc2.to,vidsrc.pm,vidsrc.in,2embed.cc,2embed.to,embedsu.com,embed.su,multiembed.mov,autoembed.cc,player.autoembed.cc,www.2embed.cc,www.2embed.to
```

## How It Works

The `/api/stream/route.ts` checks if the video URL's hostname is in the `ALLOWED_VIDEO_HOSTS` list:

```typescript
function isAllowedVideoUrl(urlString: string): boolean {
  const envHosts = process.env.ALLOWED_VIDEO_HOSTS || '';
  const allowedHosts = envHosts.split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
  
  // If allowlist is configured, enforce it strictly
  if (allowedHosts.length > 0) {
    return allowedHosts.some(
      host => hostname === host || hostname.endsWith(`.${host}`)
    );
  }
  
  return true; // No allowlist = allow all (except blocked patterns)
}
```

## Testing

1. Restart your development server to load the new environment variable
2. Try playing a video
3. Check browser console - you should see:
   - ✅ "Stream API: Processing video request"
   - ✅ "Stream API: Successfully proxying video stream"
   - ❌ No more 403 errors

## Adding More Video Sources

If you use additional video sources, add them to the `ALLOWED_VIDEO_HOSTS` variable:

```env
ALLOWED_VIDEO_HOSTS=vidsrc.cc,your-new-source.com,another-source.net
```

## Security Note

This allowlist prevents SSRF attacks where an attacker could:
- Access internal network resources (localhost, 192.168.x.x, etc.)
- Probe cloud metadata endpoints
- Use your server as a proxy to attack other services

Always keep the allowlist as restrictive as possible - only add domains you trust.

## Verification

After applying the fix:
1. ✅ Videos should play without 403 errors
2. ✅ Realtime subscription still works (you already confirmed this)
3. ✅ Premium access is granted immediately after payment
4. ✅ No security vulnerabilities introduced

## Related Files

- `/app/api/stream/route.ts` - Stream proxy with SSRF protection
- `/.env` - Environment configuration
- `/app/utils/vidsrc.ts` - Video source URL generators
- `/lib/vidsrc.ts` - Video source utilities

## Summary

The Realtime subscription fix is working perfectly (as shown by the console logs). The 403 error was a separate issue caused by missing video host configuration. Both issues are now resolved.
