import { Movie, Series, Genre } from './supabase'
import * as Reelplexi from './reelplexi'

// Movies API
export async function getMovies(limit = 20, page = 1, genre?: string) {
  try {
    const movies = await Reelplexi.getReelplexiMovies(page, limit, genre);
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

export async function getMovieTrailers(id: string) {
  try {
    return await Reelplexi.getReelplexiMovieTrailers(id);
  } catch (error) {
    console.error(`Error fetching movie trailers ${id}:`, error);
    return [];
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



export async function getSeries(limit = 24, page = 1, genre?: string) {
  try {
    const series = await Reelplexi.getReelplexiSeries(page, limit, genre);
    return series as Series[];
  } catch (error) {
    console.error('Error fetching series from Reelplexi:', error);
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

export async function getSeriesTrailers(id: string) {
  try {
    return await Reelplexi.getReelplexiSeriesTrailers(id);
  } catch (error) {
    console.error(`Error fetching series trailers ${id}:`, error);
    return [];
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

export async function getGenreRowsForHome(limit = 12) {
  try {
    const genres = await getGenres();
    let genreRows: any[] = [];
    
    if (genres && genres.length > 0) {
      // Take top 3 genres
      const topGenres = genres.slice(0, 3);
      
      const fetchedRows = await Promise.all(
        topGenres.map(async (genre) => {
          try {
            const movies = await Reelplexi.getReelplexiMoviesByGenre(genre.id, 1, limit);
            return {
              name: genre.name,
              movies: movies || []
            };
          } catch (error) {
            console.error(`Error fetching movies for genre ${genre.name}:`, error);
            return { name: genre.name, movies: [] };
          }
        })
      );
      
      genreRows = fetchedRows.filter(row => row.movies.length > 0);
    }
    
    // Fallback: If API returned no genres, build them from recent content like blog_site
    if (!genreRows || genreRows.length === 0) {
      console.log('Using fallback genre row generation from recent content');
      const allMovies = await getMovies(limit * 2);
      const allSeries = await getSeries(limit * 2);
      const allContent = [...allMovies, ...allSeries];
      
      const genreMap = new Map<string, any[]>();
      allContent.forEach(item => {
        if (item.genre_ids && Array.isArray(item.genre_ids)) {
          item.genre_ids.forEach((g: string) => {
            const prettyName = g.charAt(0).toUpperCase() + g.slice(1);
            if (!genreMap.has(prettyName)) genreMap.set(prettyName, []);
            if (!genreMap.get(prettyName)!.find(existing => existing.id === item.id)) {
              genreMap.get(prettyName)!.push(item);
            }
          });
        }
      });
      
      const extractedGenres = Array.from(genreMap.entries())
        .map(([name, movies]) => ({ name, movies }))
        .sort((a, b) => b.movies.length - a.movies.length)
        .slice(0, 3);
        
      genreRows = extractedGenres.filter(g => g.movies.length >= 2);
    }
    
    return genreRows;
  } catch (error) {
    console.error('Error fetching genre rows for home:', error);
    return [];
  }
}

// Search API using Reelplexi API filters
export async function searchMovies(query: string, limit = 20, page = 1, vjName?: string, genre?: string) {
  try {
    if (!query.trim() && !vjName) {
      return await getMovies(limit, page, genre);
    }
    const q = query.trim();
    const movies = await Reelplexi.searchReelplexiMovies(q, page, limit, vjName, genre);
    return movies as Movie[];
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
}

export async function searchSeries(query: string, limit = 20, page = 1, vjName?: string, genre?: string) {
  try {
    if (!query.trim() && !vjName) {
      return await getSeries(limit, page, genre);
    }
    const q = query.trim();
    const series = await Reelplexi.searchReelplexiSeries(q, page, limit, vjName, genre);
    return series as Series[];
  } catch (error) {
    console.error('Error searching series:', error);
    return [];
  }
}

export async function searchAllContent(query: string, limit = 50, page = 1, vjName?: string, genre?: string) {
  try {
    if (!query.trim() && !vjName) {
      const [m, s] = await Promise.all([
        getMovies(limit, page, genre),
        getSeries(limit, page, genre)
      ]);
      const combined = [...m, ...s].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      return combined.slice(0, limit);
    }
    const q = query.trim();
    const items = await Reelplexi.searchReelplexiAll(q, page, limit, vjName, genre);
    return items as any[];
  } catch (error) {
    console.error('Error searching all content:', error);
    return [];
  }
}



export async function getVJs() {
  try {
    const vjs = await Reelplexi.getReelplexiVJs(1, 100);
    return vjs.map((vj: any) => ({ id: vj.name, name: vj.name }));
  } catch (error) {
    console.error('Error fetching vjs:', error);
    return [];
  }
}

// Related content by genre
export async function getRelatedMoviesByGenre(movieId: string, genreIds: string[], limit = 6) {
  try {
    const movies = await Reelplexi.getReelplexiRelatedMoviesByGenre(movieId, 1, limit);
    if (movies && movies.length > 0) {
      return movies as Movie[];
    }
    
    // Fallback logic if API returns empty
    const allMovies = await getMovies(50, 1);
    const related = allMovies
      .filter(m => m.id !== movieId)
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);
    return related;
  } catch (error) {
    console.error('Error fetching related movies:', error);
    return [];
  }
}

export async function getRelatedSeriesByGenre(seriesId: string, genreIds: string[], limit = 6) {
  try {
    const series = await Reelplexi.getReelplexiRelatedSeriesByGenre(seriesId, 1, limit);
    if (series && series.length > 0) {
      return series as Series[];
    }
    
    // Fallback logic if API returns empty
    const allSeries = await getSeries(50, 1);
    const related = allSeries
      .filter(s => s.id !== seriesId)
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);
    return related;
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

// Download API
export async function getMovieDownload(id: string) {
  return await Reelplexi.getReelplexiMovieDownloadUrl(id);
}

export async function getEpisodeDownload(seriesId: string, season: number, episode: number) {
  return await Reelplexi.getReelplexiEpisodeDownloadUrl(seriesId, season, episode);
}