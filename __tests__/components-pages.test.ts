/**
 * Component & Page Integrity Tests
 *
 * Ensures critical pages and components exist, have correct structure,
 * and follow the established patterns.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const resolve = (...p: string[]) => path.resolve(__dirname, '..', ...p);
const fileExists = (p: string) => fs.existsSync(resolve(p));
const readFile = (p: string) => fs.readFileSync(resolve(p), 'utf-8');

// ─── Critical Pages Exist ───────────────────────────────────────────────────

describe('Critical Pages', () => {
  const pages = [
    'app/page.tsx',
    'app/search/page.tsx',
    'app/movies/[id]/page.tsx',
    'app/series/[id]/page.tsx',
    'app/payment/page.tsx',
    'app/signin/page.tsx',
    'app/signup/page.tsx',
    'app/profile/page.tsx',
    'app/download/page.tsx',
    'app/watchlist/page.tsx',
  ];

  it.each(pages)('%s exists', (page) => {
    expect(fileExists(page)).toBe(true);
  });
});

// ─── Critical Components Exist ──────────────────────────────────────────────

describe('Critical Components', () => {
  const components = [
    'components/NetflixCard.tsx',
    'components/StreamitHoverCard.tsx',
    'components/VideoPlayer.tsx',
    'components/AuthProvider.tsx',
    'app/components/Header.tsx',
    'components/Footer.tsx',
  ];

  it.each(components)('%s exists', (comp) => {
    expect(fileExists(comp)).toBe(true);
  });
});

// ─── NetflixCard Premium Badge ──────────────────────────────────────────────

describe('NetflixCard Component', () => {
  it('imports Crown icon for premium badge', () => {
    const content = readFile('components/NetflixCard.tsx');
    expect(content).toContain('Crown');
  });

  it('checks premium field on content', () => {
    const content = readFile('components/NetflixCard.tsx');
    expect(content).toContain('isPremium');
    expect(content).toContain('premium');
  });

  it('uses golden color for premium badge', () => {
    const content = readFile('components/NetflixCard.tsx');
    expect(content).toContain('#d4a017');
  });

  it('has responsive badge sizing for mobile', () => {
    const content = readFile('components/NetflixCard.tsx');
    // Should have sm: breakpoint classes for mobile optimization
    expect(content).toMatch(/sm:text-\[/);
    expect(content).toMatch(/sm:px-/);
  });

  it('does NOT have shadow glow on hover', () => {
    const content = readFile('components/NetflixCard.tsx');
    expect(content).not.toContain('shadow-[0_0_15px');
  });
});

// ─── StreamitHoverCard ──────────────────────────────────────────────────────

describe('StreamitHoverCard Component', () => {
  it('handles video load failures with fallback', () => {
    const content = readFile('components/StreamitHoverCard.tsx');
    expect(content).toContain('videoFailed');
    expect(content).toContain('onError');
  });

  it('only shows Unmute when video is playing', () => {
    const content = readFile('components/StreamitHoverCard.tsx');
    // Unmute should be conditional
    expect(content).toContain('!videoFailed');
  });

  it('uses golden premium badge', () => {
    const content = readFile('components/StreamitHoverCard.tsx');
    expect(content).toContain('#d4a017');
  });

  it('has Crown icon for premium', () => {
    const content = readFile('components/StreamitHoverCard.tsx');
    expect(content).toContain('Crown');
  });
});

// ─── Search Page ────────────────────────────────────────────────────────────

describe('Search Page', () => {
  it('loads content on mount (browse mode)', () => {
    const content = readFile('app/search/page.tsx');
    // Should fetch all content on mount, not wait for search query
    expect(content).toContain('loadInitialData');
  });

  it('has VJ filter dropdown', () => {
    const content = readFile('app/search/page.tsx');
    expect(content).toContain('selectedVJ');
    expect(content).toContain('All VJs');
  });

  it('has Genre filter dropdown', () => {
    const content = readFile('app/search/page.tsx');
    expect(content).toContain('selectedGenre');
    expect(content).toContain('All Genres');
  });

  it('does NOT have emojis in filter buttons', () => {
    const content = readFile('app/search/page.tsx');
    expect(content).not.toContain('🎙️');
    expect(content).not.toContain('🎬');
  });

  it('does NOT have counters in tab buttons', () => {
    const content = readFile('app/search/page.tsx');
    // Tab buttons should just show label, not label (count)
    expect(content).not.toMatch(/\{label\}\s*\(\{count\}\)/);
  });

  it('passes premium field to NetflixCard', () => {
    const content = readFile('app/search/page.tsx');
    expect(content).toContain('premium');
  });

  it('fetches premium field from Supabase', () => {
    const content = readFile('app/search/page.tsx');
    // The select query should include 'premium'
    const selectMatches = content.match(/\.select\(["`']([^"'`]+)["`']\)/g);
    if (selectMatches) {
      const hasPremium = selectMatches.some(m => m.includes('premium'));
      expect(hasPremium).toBe(true);
    }
  });
});

// ─── Header Navbar ──────────────────────────────────────────────────────────

describe('Header Component', () => {
  it('does NOT have VJs link in navbar', () => {
    const content = readFile('app/components/Header.tsx');
    expect(content).not.toContain('filter=vj');
  });

  it('does NOT have Genres link in navbar', () => {
    const content = readFile('app/components/Header.tsx');
    expect(content).not.toContain('filter=genre');
  });

  it('does NOT have PERSONALISE button', () => {
    const content = readFile('app/components/Header.tsx');
    expect(content).not.toContain('PERSONALISE');
  });

  it('has search link', () => {
    const content = readFile('app/components/Header.tsx');
    expect(content).toContain('/search');
  });
});

// ─── Payment Page ───────────────────────────────────────────────────────────

describe('Payment Page', () => {
  it('has frontend polling loop', () => {
    const content = readFile('app/payment/page.tsx');
    expect(content).toContain('MAX_POLLS');
    expect(content).toContain('POLL_INTERVAL');
  });

  it('handles completed payments', () => {
    const content = readFile('app/payment/page.tsx');
    expect(content).toContain('isCompleted');
  });

  it('handles failed payments', () => {
    const content = readFile('app/payment/page.tsx');
    expect(content).toContain('isFailed');
  });

  it('calls complete endpoint after success', () => {
    const content = readFile('app/payment/page.tsx');
    expect(content).toContain('/api/makypay/complete');
  });
});

// ─── View Tracking Integration ──────────────────────────────────────────────

describe('View Tracking Integration', () => {
  it('movie detail page tracks views', () => {
    const content = readFile('app/movies/[id]/page.tsx');
    expect(content).toContain('/api/track-view');
    expect(content).toContain("'movie'");
  });

  it('series detail page tracks views', () => {
    const content = readFile('app/series/[id]/page.tsx');
    expect(content).toContain('/api/track-view');
    expect(content).toContain("'series'");
  });
});

// ─── Auth Configuration ─────────────────────────────────────────────────────

describe('Supabase Auth Config', () => {
  it('uses PKCE flow to prevent token leaks in URL', () => {
    const content = readFile('lib/supabase.ts');
    expect(content).toContain("flowType: 'pkce'");
  });

  it('has detectSessionInUrl enabled', () => {
    const content = readFile('lib/supabase.ts');
    expect(content).toContain('detectSessionInUrl: true');
  });

  it('has autoRefreshToken enabled', () => {
    const content = readFile('lib/supabase.ts');
    expect(content).toContain('autoRefreshToken: true');
  });
});
