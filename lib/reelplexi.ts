import { Movie, Series, Genre, EpisodeWithSeason, Season, Episode } from './supabase';

const REELPLEXI_API_KEY = process.env.REELPLEXI_API_KEY || process.env.NEXT_PUBLIC_REELPLEXI_API_KEY || '';
const isServer = typeof window === 'undefined';
const REELPLEXI_BASE_URL = isServer ? 'https://api.reelplexi.com' : '/api/reelplexi';

class ReelplexiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ReelplexiError';
  }
}

async function fetchReelplexi(endpoint: string, params: Record<string, string | number> = {}) {
  const urlString = isServer ? `${REELPLEXI_BASE_URL}${endpoint}` : `${window.location.origin}${REELPLEXI_BASE_URL}${endpoint}`;
  const url = new URL(urlString);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (isServer && REELPLEXI_API_KEY) {
    headers['X-API-Key'] = REELPLEXI_API_KEY;
  }

  const res = await fetch(url.toString(), {
    headers,
    // We can use Next.js fetch caching here if desired, e.g. next: { revalidate: 3600 }
  });

  if (!res.ok) {
    let message = 'Unknown API error';
    try {
      const body = await res.json();
      if (body.error) {
        message = typeof body.error === 'string' ? body.error : (body.error.message || JSON.stringify(body.error));
      }
    } catch {
      // Ignored
    }
    throw new ReelplexiError(res.status, `Reelplexi API error: ${message}`);
  }

  const body = await res.json();
  return body;
}

// Helpers
const asString = (val: any) => (val ? String(val).trim() : undefined);
const yearToDate = (year: any) => (year ? `${year}-01-01` : undefined);

function extractVjName(raw: any): string | null {
  const direct = asString(raw.vj_name) || asString(raw.vj) || asString(raw.translator);
  if (direct) return direct;
  
  const versions = raw.available_vj_versions;
  if (Array.isArray(versions) && versions.length > 0 && typeof versions[0] === 'object') {
    return asString(versions[0].vj_name) || asString(versions[0].name) || null;
  }
  return null;
}

function normalizeGenres(genres: any): string[] {
  if (!Array.isArray(genres)) return [];
  return genres.map(g => asString(g)).filter(Boolean) as string[];
}

export function normalizeReelplexiMovie(raw: any): any {
  if (!raw) return null;
  const genres = normalizeGenres(raw.genres);
  const vjName = extractVjName(raw);
  const posterUrl = asString(raw.poster_url) || asString(raw.thumbnail_url) || '';
  const backdropUrl = asString(raw.backdrop_url) || posterUrl;
  
  return {
    id: asString(raw.id) || '',
    title: asString(raw.title) || asString(raw.name) || 'Untitled',
    description: asString(raw.description) || asString(raw.overview) || '',
    release_date: asString(raw.release_date) || asString(raw.released_at) || yearToDate(raw.year) || new Date().toISOString(),
    thumbnail_url: posterUrl,
    cover_image_url: backdropUrl,
    trailer_url: asString(raw.trailer_url),
    genre_ids: genres.map(g => g.toLowerCase()),
    duration: raw.duration_mins || raw.runtime || 120, // Default to 120 mins if unknown
    published: true,
    premium: raw.premium !== false, // All content is paid for by default
    recommend: raw.recommend === true,
    popular: raw.popular === true,
    latest: raw.latest === true,
    vj_id: vjName ? vjName.toLowerCase() : undefined,
    video_url: asString(raw.stream_url) || asString(raw.proxy_url),
    embed_url: asString(raw.embed_url) || `https://embed.reelplexi.com/movie/${raw.id}?key=${REELPLEXI_API_KEY}`,
    tmdb_id: raw.tmdb_id || undefined,
    vjs: vjName ? { id: vjName.toLowerCase(), name: vjName } : null,
    type: 'movie'
  };
}

export function normalizeReelplexiSeries(raw: any): any {
  if (!raw) return null;
  const genres = normalizeGenres(raw.genres);
  const vjName = extractVjName(raw);
  const posterUrl = asString(raw.poster_url) || asString(raw.thumbnail_url) || '';
  const backdropUrl = asString(raw.backdrop_url) || posterUrl;
  
  return {
    id: asString(raw.id) || '',
    title: asString(raw.title) || asString(raw.name) || 'Untitled',
    description: asString(raw.description) || asString(raw.overview) || '',
    release_date: asString(raw.first_air_date) || yearToDate(raw.year) || asString(raw.release_date) || new Date().toISOString(),
    thumbnail_url: posterUrl,
    cover_image_url: backdropUrl,
    trailer_url: asString(raw.trailer_url),
    genre_ids: genres.map(g => g.toLowerCase()),
    published: true,
    premium: raw.premium !== false, // All content is paid for by default
    created_at: raw.created_at || new Date().toISOString(),
    vj_id: vjName ? vjName.toLowerCase() : undefined,
    tmdb_id: raw.tmdb_id || undefined,
    vjs: vjName ? { id: vjName.toLowerCase(), name: vjName } : null,
    type: 'series'
  };
}

export function normalizeReelplexiEpisode(seriesId: string, seasonNumber: number, raw: any): any {
  if (!raw) return null;
  const episodeNumber = parseInt(raw.episode_number || 0, 10);
  const posterUrl = asString(raw.poster_url) || asString(raw.thumbnail_url) || '';
  const backdropUrl = asString(raw.backdrop_url) || posterUrl;
  const syntheticId = `${seriesId}:season:${seasonNumber}:episode:${episodeNumber}`;

  return {
    id: syntheticId,
    season_id: `${seriesId}:season:${seasonNumber}`,
    title: asString(raw.title) || asString(raw.name) || `Episode ${episodeNumber}`,
    episode_number: episodeNumber,
    description: asString(raw.description) || asString(raw.overview) || '',
    video_url: asString(raw.stream_url) || asString(raw.proxy_url),
    embed_url: asString(raw.embed_url) || `https://embed.reelplexi.com/tv/${seriesId}/${seasonNumber}/${episodeNumber}?key=${REELPLEXI_API_KEY}`,
    published: true,
    premium: raw.premium !== false, // All content is paid for by default
    duration: raw.duration_mins || raw.runtime || 45,
    thumbnail_url: posterUrl,
    cover_image_url: backdropUrl,
    created_at: raw.created_at || new Date().toISOString(),
  };
}

// API Methods
export async function getReelplexiMovies(page = 1, perPage = 50) {
  const res = await fetchReelplexi('/v1/movies', { page, per_page: perPage });
  return (res.data || []).map(normalizeReelplexiMovie);
}

export async function getReelplexiMovieById(id: string) {
  try {
    const res = await fetchReelplexi(`/v1/movies/${id}`);
    return normalizeReelplexiMovie(res.data || res);
  } catch (e) {
    if (e instanceof ReelplexiError && e.status === 404) return null;
    throw e;
  }
}

export async function getReelplexiSeries(page = 1, perPage = 50) {
  const res = await fetchReelplexi('/v1/series', { page, per_page: perPage });
  return (res.data || []).map(normalizeReelplexiSeries);
}

export async function getReelplexiSeriesById(id: string) {
  try {
    const res = await fetchReelplexi(`/v1/series/${id}`);
    return normalizeReelplexiSeries(res.data || res);
  } catch (e) {
    if (e instanceof ReelplexiError && e.status === 404) return null;
    throw e;
  }
}

export async function getReelplexiEpisodes(seriesId: string, season: number) {
  try {
    const res = await fetchReelplexi(`/v1/series/${seriesId}/seasons/${season}/episodes`);
    return (res.data || []).map((ep: any) => normalizeReelplexiEpisode(seriesId, season, ep));
  } catch (e) {
    if (e instanceof ReelplexiError && e.status === 404) return [];
    throw e;
  }
}

export async function getReelplexiGenres() {
  const res = await fetchReelplexi('/v1/genres');
  if (!Array.isArray(res.data)) return [];
  return res.data.map((g: any) => {
    const name = asString(g) || '';
    return { id: name.toLowerCase(), name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() };
  });
}

export async function getReelplexiTrendingAll(page = 1, perPage = 20) {
  const res = await fetchReelplexi('/v1/trending/all', { page, per_page: perPage });
  return (res.data || []).map((item: any) => {
    if (item.type === 'series' || item.first_air_date != null) {
      return normalizeReelplexiSeries(item);
    }
    return normalizeReelplexiMovie(item);
  });
}

export async function getReelplexiTrendingMovies(page = 1, perPage = 20) {
  const res = await fetchReelplexi('/v1/trending/movies', { page, per_page: perPage });
  return (res.data || []).map(normalizeReelplexiMovie);
}

export async function getReelplexiTrendingSeries(page = 1, perPage = 20) {
  const res = await fetchReelplexi('/v1/trending/series', { page, per_page: perPage });
  return (res.data || []).map(normalizeReelplexiSeries);
}

export async function getReelplexiMoviesByGenre(genre: string, page = 1, perPage = 20) {
  const res = await fetchReelplexi(`/v1/genres/${genre}/movies`, { page, per_page: perPage });
  return (res.data || []).map(normalizeReelplexiMovie);
}

export async function getReelplexiSeriesByGenre(genre: string, page = 1, perPage = 20) {
  const res = await fetchReelplexi(`/v1/genres/${genre}/series`, { page, per_page: perPage });
  return (res.data || []).map(normalizeReelplexiSeries);
}

export async function getReelplexiRelatedMoviesByGenre(id: string, page = 1, perPage = 20) {
  try {
    const res = await fetchReelplexi(`/v1/movies/${id}/related/genre`, { page, per_page: perPage });
    return (res.data || []).map(normalizeReelplexiMovie);
  } catch {
    return [];
  }
}

export async function getReelplexiRelatedSeriesByGenre(id: string, page = 1, perPage = 20) {
  try {
    const res = await fetchReelplexi(`/v1/series/${id}/related/genre`, { page, per_page: perPage });
    return (res.data || []).map(normalizeReelplexiSeries);
  } catch {
    return [];
  }
}

export async function getReelplexiMovieStream(id: string) {
  try {
    return await fetchReelplexi(`/v1/movies/${id}/stream`);
  } catch {
    return null;
  }
}

export async function getReelplexiEpisodeStream(seriesId: string, season: number, episode: number) {
  try {
    return await fetchReelplexi(`/v1/series/${seriesId}/seasons/${season}/episodes/${episode}/stream`);
  } catch {
    return null;
  }
}
