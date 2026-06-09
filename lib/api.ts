import { Movie, Series, Genre } from './supabase'
import * as Reelplexi from './reelplexi'

// Movies API
export async function getMovies(limit = 20, page = 1) {
  try {
    const movies = await Reelplexi.getReelplexiMovies(page, limit);
    return movies as Movie[];
  } catch (error) {
    console.error('Error fetching movies from Reelplexi:', error);
    return [];
}
}

export async function getMovieById(id: string) {
  try {
    const movie = await Reelplexi.getReelplexiMovieById(id);
    return movie as Movie | null;
  } catch (error) {
    console.error(`Error fetching movie ${id}:`, error);
    return null;
  }
}

export async function getMovieStream(id: string) {
  try {
    return await Reelplexi.getReelplexiMovieStream(id);
  } catch (error) {
    console.error(`Error fetching movie stream ${id}:`, error);
    return null;
  }
}

export async function getFeaturedMovie() {
  try {
    const movies = await Reelplexi.getReelplexiTrendingMovies(1, 1);
    return (movies[0] || null) as Movie | null;
  } catch (error) {
    console.error('Error fetching featured movie from Reelplexi:', error);
    return null;
  }
}

export async function getPopularMovies(limit = 6) {
  try {
    const movies = await Reelplexi.getReelplexiTrendingMovies(1, limit);
    return movies as Movie[];
  } catch (error) {
    console.error('Error fetching popular movies:', error);
    return [];
  }
}

// Series API
export async function getRelatedMoviesByGenre(id: string, genreIds: string[], limit = 6) {
  try {
    const movies = await getMovies(50, 1);
    // Simple mock implementation of related movies by genre matching
    return movies.filter(m => m.id !== id && m.genre_ids?.some((g: string) => genreIds.includes(g))).slice(0, limit);
  } catch (error) {
    console.error('Error fetching related movies:', error);
    return [];
  }
}

export async function getSeries(limit = 24, page = 1) {
  try {
    const series = await Reelplexi.getReelplexiSeries(page, limit);
    return series as Series[];
  } catch (error) {
    console.error('Error fetching series from Reelplexi:', error);
    return [];
  }
}

export async function getRelatedSeriesByGenre(id: string, genreIds: string[], limit = 6) {
  try {
    const series = await getSeries(50, 1);
    return series.filter(s => s.id !== id && s.genre_ids?.some((g: string) => genreIds.includes(g))).slice(0, limit);
  } catch (error) {
    console.error('Error fetching related series:', error);
    return [];
  }
}

export async function getSeriesById(id: string) {
  try {
    const series = await Reelplexi.getReelplexiSeriesById(id);
    return series as Series | null;
  } catch (error) {
    console.error(`Error fetching series ${id}:`, error);
    return null;
  }
}

export async function getEpisodes(seriesId: string, season: number) {
  try {
    return await Reelplexi.getReelplexiEpisodes(seriesId, season);
  } catch (error) {
    console.error(`Error fetching episodes for series ${seriesId} season ${season}:`, error);
    return [];
  }
}

export async function getEpisodeStream(seriesId: string, season: number, episode: number) {
  try {
    return await Reelplexi.getReelplexiEpisodeStream(seriesId, season, episode);
  } catch (error) {
    console.error(`Error fetching stream for series ${seriesId} season ${season} episode ${episode}:`, error);
    return null;
  }
}

// Translated in Streamit previously meant NO VJ_ID (original language)
export async function getTranslatedMovies(limit = 6) {
  try {
    // Fetch a larger batch to filter
    const movies = await Reelplexi.getReelplexiMovies(1, 50);
    return movies.filter((m: any) => !m.vj_id).slice(0, limit) as Movie[];
  } catch (error) {
    console.error('Error fetching translated movies:', error);
    return [];
  }
}

export async function getTranslatedSeries(limit = 6) {
  try {
    const series = await Reelplexi.getReelplexiSeries(1, 50);
    return series.filter((s: any) => !s.vj_id).slice(0, limit) as Series[];
  } catch (error) {
    console.error('Error fetching translated series:', error);
    return [];
  }
}

export async function getTranslatedContent(limit = 12) {
  const movies = await getTranslatedMovies(limit);
  const series = await getTranslatedSeries(limit);
  const combined = [...movies, ...series];
  return combined.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, limit);
}

export async function getVJMovies(limit = 6) {
  try {
    const movies = await Reelplexi.getReelplexiMovies(1, 50);
    return movies.filter((m: any) => !!m.vj_id).slice(0, limit) as (Movie & { vjs: { id: string; name: string } | null })[];
  } catch (error) {
    console.error('Error fetching VJ movies:', error);
    return [];
  }
}

export async function getVJSeries(limit = 6) {
  try {
    const series = await Reelplexi.getReelplexiSeries(1, 50);
    return series.filter((s: any) => !!s.vj_id).slice(0, limit) as (Series & { vjs: { id: string; name: string } | null })[];
  } catch (error) {
    console.error('Error fetching VJ series:', error);
    return [];
  }
}

export async function getVJContent(limit = 12) {
  const movies = await getVJMovies(limit);
  const series = await getVJSeries(limit);
  const combined = [...movies, ...series];
  return combined.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, limit);
}

// Genres API
export async function getGenres() {
  try {
    return await Reelplexi.getReelplexiGenres() as Genre[];
  } catch (error) {
    console.error('Error fetching genres from Reelplexi:', error);
    return [];
  }
}

// Search API (simulated via local filter as Reelplexi API has no explicit /v1/search endpoint documented)
export async function searchMovies(query: string, limit = 20) {
  try {
    const movies = await Reelplexi.getReelplexiMovies(1, 50);
    const lowerQuery = query.toLowerCase();
    return movies.filter((m: any) => 
      m.title.toLowerCase().includes(lowerQuery) || 
      (m.description && m.description.toLowerCase().includes(lowerQuery))
    ).slice(0, limit) as Movie[];
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
}

export async function searchSeries(query: string, limit = 20) {
  try {
    const series = await Reelplexi.getReelplexiSeries(1, 50);
    const lowerQuery = query.toLowerCase();
    return series.filter((s: any) => 
      s.title.toLowerCase().includes(lowerQuery) || 
      (s.description && s.description.toLowerCase().includes(lowerQuery))
    ).slice(0, limit) as Series[];
  } catch (error) {
    console.error('Error searching series:', error);
    return [];
  }
}

// Related content by genre
export async function getRelatedMoviesByGenre(movieId: string, genreIds: string[], limit = 6) {
  try {
    const movies = await Reelplexi.getReelplexiRelatedMoviesByGenre(movieId, 1, limit);
    return movies as Movie[];
  } catch (error) {
    console.error('Error fetching related movies:', error);
    return [];
  }
}

export async function getRelatedSeriesByGenre(seriesId: string, genreIds: string[], limit = 6) {
  try {
    const series = await Reelplexi.getReelplexiRelatedSeriesByGenre(seriesId, 1, limit);
    return series as Series[];
  } catch (error) {
    console.error('Error fetching related series:', error);
    return [];
  }
}

// Kilax Exclusive Content API - Mapping to Trending for now since Reelplexi is the source
export async function getKilaxExclusiveMovies(limit = 6) {
  try {
    const movies = await Reelplexi.getReelplexiTrendingMovies(1, limit);
    return movies as Movie[];
  } catch (error) {
    console.error('Error fetching Kilax exclusive movies:', error);
    return [];
  }
}

export async function getKilaxExclusiveSeries(limit = 6) {
  try {
    const series = await Reelplexi.getReelplexiTrendingSeries(1, limit);
    return series as Series[];
  } catch (error) {
    console.error('Error fetching Kilax exclusive series:', error);
    return [];
  }
}

export async function getKilaxExclusiveContent(limit = 12) {
  try {
    const all = await Reelplexi.getReelplexiTrendingAll(1, limit);
    return all as Array<(Movie | Series) & { type: 'movie' | 'series'; vjs: { id: string; name: string } | null }>;
  } catch (error) {
    console.error('Error fetching Kilax exclusive content:', error);
    return [];
  }
}

// Category API
export async function getMoviesByCategory(category: string, limit = 20) {
  try {
    const movies = await Reelplexi.getReelplexiMoviesByGenre(category.toLowerCase(), 1, limit);
    return movies as Movie[];
  } catch (error) {
    console.error('Error fetching movies by category:', error);
    return [];
  }
}

export async function getSeriesByCategory(category: string, limit = 20) {
  try {
    const series = await Reelplexi.getReelplexiSeriesByGenre(category.toLowerCase(), 1, limit);
    return series as Series[];
  } catch (error) {
    console.error('Error fetching series by category:', error);
    return [];
  }
}