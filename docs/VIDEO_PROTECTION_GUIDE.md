# Video Protection Implementation Guide

## Overview

This guide explains how to implement video link protection to prevent unauthorized access to your video content. The protection system uses multiple layers of security:

1. **Referrer Checking** - Ensures requests come from your domain
2. **Token-Based Authentication** - Time-limited signed tokens
3. **Rate Limiting** - Prevents abuse from single IPs

## Quick Start

### 1. Set Environment Variables

Add to your `.env` file:

```env
# Generate a strong random secret (use: openssl rand -hex 32)
VIDEO_SECRET=your-super-secret-key-change-this-now

# Your production domain
NEXT_PUBLIC_APP_DOMAIN=streamit.com

# Optional: Vercel URL (auto-set by Vercel)
NEXT_PUBLIC_VERCEL_URL=your-app.vercel.app
```

### 2. Basic Usage in Components

```typescript
import { generateVideoToken } from '@/lib/video-protection';

function MoviePlayer({ movie, user }) {
  // Generate a token for this video
  const token = generateVideoToken(movie.id, user?.id);
  
  // Create protected URL
  const protectedUrl = `/api/protected-stream?url=${encodeURIComponent(movie.video_url)}&token=${token}`;
  
  return <video src={protectedUrl} controls />;
}
```

### 3. Using with VideoPlayer Component

```typescript
import VideoPlayer from '@/components/VideoPlayer';
import { generateProtectedVideoUrl } from '@/lib/video-protection';

function MovieDetail({ movie, user }) {
  const protectedUrl = generateProtectedVideoUrl(
    '/api/protected-stream',
    movie.id,
    user?.id
  );
  
  return (
    <VideoPlayer 
      src={protectedUrl}
      title={movie.title}
    />
  );
}
```

## Advanced Configuration

### Custom Token Expiry

```typescript
// Token expires in 30 minutes
const token = generateVideoToken(
  videoId,
  userId,
  1800 // 30 minutes in seconds
);
```

### Custom Rate Limits

```typescript
import { checkRateLimit } from '@/lib/video-protection';

// Allow 50 requests per 5 minutes
const rateLimit = checkRateLimit(
  clientIp,
  50,        // max requests
  300000     // 5 minutes in milliseconds
);

if (!rateLimit.allowed) {
  return Response.json(
    { error: 'Too many requests' },
    { status: 429 }
  );
}
```

### Custom Allowed Domains

```typescript
import { checkReferrer } from '@/lib/video-protection';

const isAllowed = checkReferrer(
  request.headers.get('referer'),
  ['yourdomain.com', 'staging.yourdomain.com']
);
```

## Integration with Existing Endpoints

### Option 1: Update Existing Stream Endpoint

Modify `app/api/stream/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { protectVideoEndpoint } from '@/lib/video-protection';

export async function GET(request: NextRequest) {
  // Add protection
  const protection = await protectVideoEndpoint(request);
  
  if (!protection.allowed) {
    return NextResponse.json(
      { error: protection.error || 'Access denied' },
      { status: 403 }
    );
  }
  
  // Your existing streaming logic
  const url = request.nextUrl.searchParams.get('url');
  // ... rest of code
}
```

### Option 2: Use New Protected Endpoint

The new `/api/protected-stream` endpoint is already set up. Just generate tokens and use it:

```typescript
const token = generateVideoToken(videoId, userId);
const url = `/api/protected-stream?url=${encodeURIComponent(videoUrl)}&token=${token}`;
```

## Client-Side Implementation

### React Hook for Protected URLs

Create a custom hook:

```typescript
// hooks/useProtectedVideo.ts
import { useMemo } from 'react';
import { generateVideoToken } from '@/lib/video-protection';
import { useAuth } from '@/components/AuthProvider';

export function useProtectedVideo(videoId: string, videoUrl: string) {
  const { user } = useAuth();
  
  const protectedUrl = useMemo(() => {
    if (!videoUrl) return null;
    
    const token = generateVideoToken(videoId, user?.id);
    return `/api/protected-stream?url=${encodeURIComponent(videoUrl)}&token=${token}`;
  }, [videoId, videoUrl, user?.id]);
  
  return protectedUrl;
}

// Usage
function VideoPlayer({ movie }) {
  const protectedUrl = useProtectedVideo(movie.id, movie.video_url);
  
  return <video src={protectedUrl} controls />;
}
```

### Handling Token Expiry

Tokens expire after 1 hour by default. To handle expiry:

```typescript
import { useState, useEffect } from 'react';

function VideoPlayer({ movie, user }) {
  const [videoUrl, setVideoUrl] = useState('');
  
  // Regenerate token every 50 minutes (before expiry)
  useEffect(() => {
    const generateUrl = () => {
      const token = generateVideoToken(movie.id, user?.id);
      const url = `/api/protected-stream?url=${encodeURIComponent(movie.video_url)}&token=${token}`;
      setVideoUrl(url);
    };
    
    generateUrl();
    const interval = setInterval(generateUrl, 50 * 60 * 1000); // 50 minutes
    
    return () => clearInterval(interval);
  }, [movie.id, movie.video_url, user?.id]);
  
  return <video src={videoUrl} controls />;
}
```

## Server-Side Protection

### Protecting Download Endpoints

```typescript
// app/api/download/route.ts
import { protectVideoEndpoint } from '@/lib/video-protection';

export async function GET(request: NextRequest) {
  const protection = await protectVideoEndpoint(request);
  
  if (!protection.allowed) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }
  
  // Serve download
  const url = request.nextUrl.searchParams.get('url');
  const response = await fetch(url);
  
  return new NextResponse(response.body, {
    headers: {
      'Content-Disposition': 'attachment; filename="video.mp4"',
      'Content-Type': 'video/mp4',
    },
  });
}
```

### Protecting HLS/DASH Streams

For adaptive streaming:

```typescript
// Generate token for master playlist
const masterToken = generateVideoToken(videoId, userId, 7200); // 2 hours

// Generate tokens for segments (shorter expiry)
const segmentToken = generateVideoToken(`${videoId}-segment`, userId, 300); // 5 minutes
```

## Production Considerations

### 1. Use Redis for Rate Limiting

Replace in-memory store with Redis:

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export async function checkRateLimitRedis(
  ip: string,
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  const key = `rate-limit:${ip}`;
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart);
  
  // Count requests in window
  const count = await redis.zcard(key);
  
  if (count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  // Add current request
  await redis.zadd(key, { score: now, member: now.toString() });
  await redis.expire(key, Math.ceil(windowMs / 1000));
  
  return { allowed: true, remaining: maxRequests - count - 1 };
}
```

### 2. CDN Integration

For Cloudflare or other CDNs:

```typescript
// Generate signed URLs compatible with CDN
export function generateCDNSignedUrl(
  videoUrl: string,
  expiresIn: number = 3600
) {
  const expiry = Math.floor(Date.now() / 1000) + expiresIn;
  const signature = createHash('sha256')
    .update(`${videoUrl}${expiry}${VIDEO_SECRET}`)
    .digest('hex');
  
  return `${videoUrl}?expires=${expiry}&signature=${signature}`;
}
```

### 3. Monitoring and Logging

Add logging for security events:

```typescript
import { protectVideoEndpoint } from '@/lib/video-protection';

export async function GET(request: NextRequest) {
  const protection = await protectVideoEndpoint(request);
  
  if (!protection.allowed) {
    // Log failed attempt
    console.warn('Video access denied:', {
      ip: getClientIp(request.headers),
      reason: protection.error,
      url: request.url,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }
  
  // ... serve video
}
```

## Testing

### Test Token Generation

```typescript
import { generateVideoToken, verifyVideoToken } from '@/lib/video-protection';

// Generate token
const token = generateVideoToken('test-video-123', 'user-456');
console.log('Token:', token);

// Verify token
const result = verifyVideoToken(token);
console.log('Valid:', result.valid);
console.log('Payload:', result.payload);
```

### Test Rate Limiting

```bash
# Test rate limit with curl
for i in {1..110}; do
  curl -H "X-Forwarded-For: 192.168.1.1" \
    "http://localhost:3000/api/protected-stream?url=test&token=xxx"
  echo "Request $i"
done
```

### Test Referrer Checking

```bash
# Should fail (no referrer)
curl "http://localhost:3000/api/protected-stream?url=test&token=xxx"

# Should succeed
curl -H "Referer: http://localhost:3000" \
  "http://localhost:3000/api/protected-stream?url=test&token=xxx"
```

## Troubleshooting

### "Invalid referrer" Error

- Check that `NEXT_PUBLIC_APP_DOMAIN` is set correctly
- Ensure requests include the Referer header
- Add your domain to allowed domains list

### "Token expired" Error

- Tokens expire after 1 hour by default
- Regenerate tokens before they expire
- Increase token expiry time if needed

### "Rate limit exceeded" Error

- Adjust rate limits for your use case
- Implement Redis for distributed rate limiting
- Whitelist trusted IPs if needed

### Videos Not Playing

1. Check browser console for errors
2. Verify token is being generated correctly
3. Test the video URL directly (should fail without token)
4. Check server logs for protection errors

## Security Checklist

- [ ] Changed VIDEO_SECRET from default
- [ ] Set NEXT_PUBLIC_APP_DOMAIN correctly
- [ ] Tested token generation and verification
- [ ] Tested rate limiting
- [ ] Tested referrer checking
- [ ] Implemented Redis for production
- [ ] Added monitoring and logging
- [ ] Tested on mobile devices
- [ ] Tested with different browsers
- [ ] Documented for your team

## Additional Resources

- [Video Protection Utilities](../lib/video-protection.ts)
- [Protected Stream Endpoint](../app/api/protected-stream/route.ts)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
