/**
 * Security Tests — Streaming Server & Credential Protection
 *
 * Ensures:
 * - Streaming server credentials are NOT exposed in client-side code
 * - The /api/stream proxy validates inputs properly
 * - No hardcoded secrets leak to the browser bundle
 * - Video URLs are properly sanitized
 */
import { describe, it, expect } from 'vitest';
import { normalizeVideoUrl } from '@/lib/utils';
import fs from 'fs';
import path from 'path';

// ─── Video URL Normalization ────────────────────────────────────────────────

describe('normalizeVideoUrl', () => {
  it('prepends https:// to bare domains', () => {
    expect(normalizeVideoUrl('example.com/video.mp4')).toBe('https://example.com/video.mp4');
  });

  it('leaves https:// URLs unchanged', () => {
    expect(normalizeVideoUrl('https://cdn.example.com/video.mp4')).toBe('https://cdn.example.com/video.mp4');
  });

  it('leaves http:// URLs unchanged', () => {
    expect(normalizeVideoUrl('http://cdn.example.com/video.mp4')).toBe('http://cdn.example.com/video.mp4');
  });

  it('returns "#" as-is', () => {
    expect(normalizeVideoUrl('#')).toBe('#');
  });

  it('returns empty string as-is', () => {
    expect(normalizeVideoUrl('')).toBe('');
  });
});

// ─── Credential Exposure Prevention ─────────────────────────────────────────

describe('Credential Security', () => {
  const clientSideFiles = [
    'components/ArtPlayer.tsx',
    'components/VideoPlayer.tsx',
    'components/StreamitHoverCard.tsx',
    'components/NetflixCard.tsx',
    'app/movies/[id]/page.tsx',
    'app/series/[id]/page.tsx',
  ];

  it('client-side components must NOT have CADDY credentials', () => {
    const artPlayerPath = path.resolve(__dirname, '../components/ArtPlayer.tsx');
    if (fs.existsSync(artPlayerPath)) {
      const content = fs.readFileSync(artPlayerPath, 'utf-8');
      // Must use proxy, not direct credentials
      expect(content).not.toContain('NEXT_PUBLIC_CADDY_USERNAME');
      expect(content).not.toContain('NEXT_PUBLIC_CADDY_PASSWORD');
      expect(content).not.toContain('MatTh3pAR');
      // Should route through /api/stream proxy
      expect(content).toContain('/api/stream');
    }
  });

  it('stream API route should use server-side-only env vars when configured', () => {
    const streamRoutePath = path.resolve(__dirname, '../app/api/stream/route.ts');
    if (fs.existsSync(streamRoutePath)) {
      const content = fs.readFileSync(streamRoutePath, 'utf-8');
      // Must use server-only env vars, NOT NEXT_PUBLIC_
      expect(content).not.toContain('NEXT_PUBLIC_CADDY');
      expect(content).toContain('CADDY_USERNAME');
      expect(content).toContain('CADDY_PASSWORD');
      // Must NOT have hardcoded credentials
      expect(content).not.toContain('MatTh3pAR');
    }
  });

  it('stream API error responses must NOT leak upstream URLs', () => {
    const streamRoutePath = path.resolve(__dirname, '../app/api/stream/route.ts');
    if (fs.existsSync(streamRoutePath)) {
      const content = fs.readFileSync(streamRoutePath, 'utf-8');
      // Must NOT return the upstream URL in error responses
      expect(content).not.toMatch(/url:\s*videoUrl/);
      // Must NOT return internal error details
      expect(content).not.toContain('details:');
    }
  });

  it('no client-side files contain streaming server passwords', () => {
    for (const filePath of clientSideFiles) {
      const fullPath = path.resolve(__dirname, '..', filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content).not.toContain('MatTh3pAR');
        expect(content).not.toContain('NEXT_PUBLIC_CADDY');
      }
    }
  });

  it('no client-side files log URLs to console', () => {
    for (const filePath of clientSideFiles) {
      const fullPath = path.resolve(__dirname, '..', filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Should not log URLs that might contain credentials
        expect(content).not.toMatch(/console\.(log|error).*[Uu]rl.*:/);
      }
    }
  });

  it('.env file should NOT be tracked in .gitignore', () => {
    const gitignorePath = path.resolve(__dirname, '../.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      expect(gitignore).toContain('.env');
    }
  });

  it('service role key should never appear in client-side files', () => {
    for (const filePath of clientSideFiles) {
      const fullPath = path.resolve(__dirname, '..', filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
        expect(content).not.toContain('service_role');
      }
    }
  });
});

// ─── Stream API Input Validation ────────────────────────────────────────────

describe('Stream API Route Security', () => {
  it('stream route requires url parameter', () => {
    const streamRoutePath = path.resolve(__dirname, '../app/api/stream/route.ts');
    if (fs.existsSync(streamRoutePath)) {
      const content = fs.readFileSync(streamRoutePath, 'utf-8');
      // Must check for missing URL
      expect(content).toContain("'url'");
      expect(content).toContain('400');
    }
  });

  it('stream route sanitizes download filenames', () => {
    const streamRoutePath = path.resolve(__dirname, '../app/api/stream/route.ts');
    if (fs.existsSync(streamRoutePath)) {
      const content = fs.readFileSync(streamRoutePath, 'utf-8');
      // Must sanitize filenames to prevent path traversal
      expect(content).toMatch(/replace.*[^a-zA-Z0-9]/);
    }
  });
});

// ─── Video URL Protection (Phases 1-3) ──────────────────────────────────────

describe('Video URL Protection', () => {
  it('lib/api.ts listing functions must NOT include video_url in select', () => {
    const apiPath = path.resolve(__dirname, '../lib/api.ts');
    if (fs.existsSync(apiPath)) {
      const content = fs.readFileSync(apiPath, 'utf-8');
      // Must use display-only column constants
      expect(content).toContain('MOVIE_DISPLAY_COLS');
      expect(content).toContain('SERIES_DISPLAY_COLS');
      // Display column definitions must NOT include video URLs
      const movieColsMatch = content.match(/MOVIE_DISPLAY_COLS\s*=\s*`([^`]+)`/);
      if (movieColsMatch) {
        expect(movieColsMatch[1]).not.toContain('video_url');
        expect(movieColsMatch[1]).not.toContain('videolink_url');
        expect(movieColsMatch[1]).not.toContain('trailer_url');
      }
    }
  });

  it('genre-home-supabase.ts must NOT use select(*) for movies', () => {
    const genrePath = path.resolve(__dirname, '../lib/genre-home-supabase.ts');
    if (fs.existsSync(genrePath)) {
      const content = fs.readFileSync(genrePath, 'utf-8');
      // Should use safe columns, not select('*')
      expect(content).not.toMatch(/\.select\(`\*,?\s*vjs/);
      expect(content).toContain('MOVIE_SAFE_COLS');
    }
  });

  it('movie detail page must NOT query video_url from Supabase', () => {
    const moviePagePath = path.resolve(__dirname, '../app/movies/[id]/page.tsx');
    if (fs.existsSync(moviePagePath)) {
      const content = fs.readFileSync(moviePagePath, 'utf-8');
      // Must NOT have select("*") or select with video_url
      expect(content).not.toMatch(/\.select\(\s*["']\*,?\s*vjs/);
      // Must use the secure API to get video URLs
      expect(content).toContain('/api/get-video-url');
    }
  });

  it('series detail page must NOT query episode video_url from Supabase', () => {
    const seriesPagePath = path.resolve(__dirname, '../app/series/[id]/page.tsx');
    if (fs.existsSync(seriesPagePath)) {
      const content = fs.readFileSync(seriesPagePath, 'utf-8');
      // Episodes must use display-only columns
      expect(content).toContain('EPISODE_DISPLAY_COLS');
      // Must use the secure API to get video URLs
      expect(content).toContain('/api/get-video-url');
    }
  });

  it('PlayerContent must NOT query video_url from Supabase', () => {
    const playerPath = path.resolve(__dirname, '../app/player/PlayerContent.tsx');
    if (fs.existsSync(playerPath)) {
      const content = fs.readFileSync(playerPath, 'utf-8');
      // Must use the secure API for video URLs
      expect(content).toContain('/api/get-video-url');
      // Must NOT select video_url in any Supabase query
      expect(content).not.toMatch(/select.*video_url/);
    }
  });

  it('secure get-video-url API route must exist and require authentication', () => {
    const routePath = path.resolve(__dirname, '../app/api/get-video-url/route.ts');
    expect(fs.existsSync(routePath)).toBe(true);
    const content = fs.readFileSync(routePath, 'utf-8');
    // Must validate Bearer token
    expect(content).toContain('Bearer');
    expect(content).toContain('authorization');
    // Must check premium access
    expect(content).toContain('premium');
    // Must return proxied URL, not raw
    expect(content).toContain('/api/stream');
    // Must use service role to fetch video_url (not anon key)
    expect(content).toContain('SUPABASE_SERVICE_ROLE_KEY');
    // Must return 401 for missing auth
    expect(content).toContain('401');
  });

  it('video-protection.ts must NOT have bypass/disable', () => {
    const protPath = path.resolve(__dirname, '../lib/video-protection.ts');
    if (fs.existsSync(protPath)) {
      const content = fs.readFileSync(protPath, 'utf-8');
      // Must NOT have a disabled bypass
      expect(content).not.toContain('TEMPORARILY DISABLED');
      expect(content).not.toMatch(/return\s*\{\s*allowed:\s*true\s*\}\s*;[\s\S]*\/\*.*ORIGINAL/);
      // Must have active referrer checking
      expect(content).toContain('checkReferrer');
      // Must have active rate limiting
      expect(content).toContain('checkRateLimit');
    }
  });

  it('home page watchlist queries must NOT include video_url', () => {
    const homePath = path.resolve(__dirname, '../app/page.tsx');
    if (fs.existsSync(homePath)) {
      const content = fs.readFileSync(homePath, 'utf-8');
      // Watchlist queries should use safe columns
      expect(content).not.toMatch(/from\('movies'\)\.select\('\*,?\s*vjs/);
      expect(content).not.toMatch(/from\('series'\)\.select\('\*,?\s*vjs/);
    }
  });
});
