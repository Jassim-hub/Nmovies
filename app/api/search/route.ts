import { NextRequest, NextResponse } from 'next/server';
import { searchMovies, searchSeries } from '@/lib/api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const filter = searchParams.get('filter') || 'all';
  const sort = searchParams.get('sort') || 'relevance';
  const genre = searchParams.get('genre') || 'all';
  const vj = searchParams.get('vj') || 'all';

  console.log('🔍 Search API called with:', { query, filter, sort, genre, vj });

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results: any[] = [];
    const lowerQuery = query.toLowerCase();

    // Search movies
    if (filter === 'all' || filter === 'movies') {
      let movies = await searchMovies(query, 50);

      if (genre !== 'all') {
        movies = movies.filter(m => m.genre_ids?.includes(genre));
      }
      if (vj !== 'all') {
        movies = movies.filter(m => m.vj_id === vj);
      }

      results.push(...movies.map(m => ({
        ...m,
        type: 'movie',
        poster_url: m.thumbnail_url || m.cover_image_url
      })));
    }

    // Search series
    if (filter === 'all' || filter === 'series') {
      let series = await searchSeries(query, 50);

      if (genre !== 'all') {
        series = series.filter(s => s.genre_ids?.includes(genre));
      }
      if (vj !== 'all') {
        series = series.filter(s => s.vj_id === vj);
      }

      results.push(...series.map(s => ({
        ...s,
        type: 'series',
        poster_url: s.thumbnail_url || s.cover_image_url
      })));
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('💥 Search API error:', error);
    return NextResponse.json({
      results: [],
      error: 'Search failed',
    }, { status: 500 });
  }
}