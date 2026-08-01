const REELPLEXI_API_KEY = (process.env.REELPLEXI_API_KEY || process.env.NEXT_PUBLIC_REELPLEXI_API_KEY || '').replace(/[^\x20-\x7E]/g, '').trim();
const isServer = typeof window === 'undefined';
const REELPLEXI_BASE_URL = isServer ? 'https://api.reelplexi.com' : '/panel/api/reelplexi';

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
    headers['Authorization'] = `Bearer ${REELPLEXI_API_KEY}`;
  }

  const res = await fetch(url.toString(), {
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    let message = 'Unknown API error';
    const text = await res.text();
    try {
      const body = JSON.parse(text);
      if (body.detail) {
        const detailMsg = typeof body.detail === 'string' 
          ? body.detail 
          : (body.detail.error?.message || JSON.stringify(body.detail));
        throw new ReelplexiError(res.status, `Reelplexi API error (HTTP ${res.status}): ${detailMsg}`);
      }
      if (body.error) {
        message = typeof body.error === 'string' ? body.error : (body.error.message || JSON.stringify(body.error));
      }
    } catch (e) {
      if (e instanceof ReelplexiError) throw e;
      throw new ReelplexiError(res.status, `HTTP error ${res.status}: ${text.substring(0, 150)}`);
    }
    throw new ReelplexiError(res.status, `Reelplexi API error: ${message}`);
  }

  return await res.json();
}

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
    description: asString(raw.description) || asString(raw.overview) || asString(raw.plot) || asString(raw.synopsis) || asString(raw.storyline) || '',
    release_date: asString(raw.release_date) || asString(raw.released_at) || yearToDate(raw.year) || new Date().toISOString(),
    thumbnail_url: posterUrl,
    cover_image_url: backdropUrl,
    trailer_url: asString(raw.trailer_url),
    genre_ids: genres.map(g => g.toLowerCase()),
    duration: raw.duration_mins || raw.runtime || 120,
    published: true,
    premium: raw.premium !== false,
    recommend: raw.recommend === true,
    popular: raw.popular === true,
    latest: raw.latest === true,
    vj_id: vjName ? vjName.toLowerCase() : undefined,
    video_url: asString(raw.stream_url) || asString(raw.proxy_url),
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
  const seriesId = asString(raw.id) || '';

  return {
    id: seriesId,
    title: asString(raw.title) || asString(raw.name) || 'Untitled',
    description: asString(raw.description) || asString(raw.overview) || asString(raw.plot) || asString(raw.synopsis) || asString(raw.storyline) || '',
    release_date: asString(raw.first_air_date) || yearToDate(raw.year) || asString(raw.release_date) || new Date().toISOString(),
    thumbnail_url: posterUrl,
    cover_image_url: backdropUrl,
    trailer_url: asString(raw.trailer_url),
    genre_ids: genres.map(g => g.toLowerCase()),
    published: true,
    premium: raw.premium !== false,
    created_at: raw.created_at || new Date().toISOString(),
    vj_id: vjName ? vjName.toLowerCase() : undefined,
    vjs: vjName ? { id: vjName.toLowerCase(), name: vjName } : null,
    type: 'series',
  };
}

export async function getReelplexiMovies(page = 1, perPage = 50, genre?: string) {
  const params: Record<string, string | number> = { page, per_page: perPage };
  if (genre) params.genre = genre;
  const res = await fetchReelplexi('/v1/movies', params);
  return {
    data: (res.data || []).map(normalizeReelplexiMovie),
    total: res.total || res.count || (res.data ? res.data.length : 0),
  };
}

export async function searchReelplexiMovies(query: string, page = 1, perPage = 50, vj?: string, genre?: string) {
  const params: Record<string, string | number> = { page, per_page: perPage };
  const vjNorm = vj ? vj.toLowerCase() : undefined;
  if (genre) params.genre = genre;

  if (!query.trim()) {
    if (vjNorm) params.vj = vjNorm;
    const res = await fetchReelplexi('/v1/movies', params);
    return {
      data: (res.data || []).map(normalizeReelplexiMovie),
      total: res.total || res.count || (res.data ? res.data.length : 0),
    };
  }

  params.q = query.trim();
  if (vjNorm) params.vj = vjNorm;
  const res = await fetchReelplexi('/v1/movies/search', params);
  return {
    data: (res.data || []).map(normalizeReelplexiMovie),
    total: res.total || res.count || (res.data ? res.data.length : 0),
  };
}

export async function getReelplexiSeries(page = 1, perPage = 50, genre?: string) {
  const params: Record<string, string | number> = { page, per_page: perPage };
  if (genre) params.genre = genre;
  const res = await fetchReelplexi('/v1/series', params);
  return {
    data: (res.data || []).map(normalizeReelplexiSeries),
    total: res.total || res.count || (res.data ? res.data.length : 0),
  };
}

export async function searchReelplexiSeries(query: string, page = 1, perPage = 50, vj?: string, genre?: string) {
  const params: Record<string, string | number> = { page, per_page: perPage };
  const vjNorm = vj ? vj.toLowerCase() : undefined;
  if (genre) params.genre = genre;

  if (!query.trim()) {
    if (vjNorm) params.vj = vjNorm;
    const res = await fetchReelplexi('/v1/series', params);
    return {
      data: (res.data || []).map(normalizeReelplexiSeries),
      total: res.total || res.count || (res.data ? res.data.length : 0),
    };
  }

  params.q = query.trim();
  if (vjNorm) params.vj = vjNorm;
  const res = await fetchReelplexi('/v1/series/search', params);
  return {
    data: (res.data || []).map(normalizeReelplexiSeries),
    total: res.total || res.count || (res.data ? res.data.length : 0),
  };
}

export async function getReelplexiGenres() {
  try {
    const res = await fetchReelplexi('/v1/genres');
    if (!Array.isArray(res.data)) return [];
    return res.data.map((g: any) => {
      const name = asString(g) || '';
      return { id: name.toLowerCase(), name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() };
    });
  } catch {
    return [];
  }
}
