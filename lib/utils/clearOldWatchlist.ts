/**
 * Utility to clear old watchlist format from localStorage
 * Run this once if you're experiencing issues with watchlist
 */
export function clearOldWatchlistData() {
  try {
    const watchlist = localStorage.getItem('streamit_watchlist');
    if (watchlist) {
      const parsed = JSON.parse(watchlist);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const firstItem = parsed[0];
        // Check if it's old format (string) or corrupted
        if (typeof firstItem === 'string' || !firstItem.type || !firstItem.id) {
          console.log('Clearing old/corrupted watchlist data...');
          localStorage.removeItem('streamit_watchlist');
          console.log('Cleared! Please refresh the page.');
          return true;
        }
      }
    }
    console.log('No old watchlist data found.');
    return false;
  } catch (e) {
    console.error('Error clearing watchlist:', e);
    localStorage.removeItem('streamit_watchlist');
    return true;
  }
}

// For debugging: Log current watchlist format
export function debugWatchlist() {
  const watchlist = localStorage.getItem('streamit_watchlist');
  if (!watchlist) {
    console.log('No watchlist data in localStorage');
    return;
  }
  
  try {
    const parsed = JSON.parse(watchlist);
    console.log('Watchlist data:', parsed);
    if (Array.isArray(parsed)) {
      console.log(`Total items: ${parsed.length}`);
      parsed.forEach((item, index) => {
        console.log(`Item ${index}:`, item);
      });
    }
  } catch (e) {
    console.error('Failed to parse watchlist:', e);
  }
}

// Expose to window for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).clearOldWatchlist = clearOldWatchlistData;
  (window as any).debugWatchlist = debugWatchlist;
}
