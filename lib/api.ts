import { supabase, Movie, Series, Genre } from './supabase'

// Movies API - Enhanced with video URLs and watchable content
export async function getMovies(limit = 20) {
  const { data, error } = await supabase
    .from('movies')
    .select(`
      *,
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .not('video_url', 'is', null) // Only fetch movies with video URLs
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching movies:', error)
    return []
  }

  // Normalize vjs field
  const result = (data || []).map((item: any) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as Movie[]
}

export async function getFeaturedMovie() {
  const { data, error } = await supabase
    .from('movies')
    .select(`
      *,
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .eq('recommend', true)
    .not('video_url', 'is', null) // Must have video URL to be watchable
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching featured movie:', error)
    return null
  }

  // Normalize vjs field
  const result = {
    ...data,
    vjs: Array.isArray(data.vjs) ? data.vjs[0] || null : data.vjs || null
  };

  return result as Movie
}

export async function getPopularMovies(limit = 6) {
  const { data, error } = await supabase
    .from('movies')
    .select(`
      id, title, description, release_date, thumbnail_url, cover_image_url, duration, premium, created_at,
      video_url, videolink_url, trailer_url,
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .eq('popular', true)
    .not('video_url', 'is', null) // Only fetch movies with video URLs
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching popular movies:', error)
    return []
  }

  // Normalize vjs field
  const result = (data || []).map((item: any) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as Movie[]
}

// Series API - Enhanced with video URLs and watchable content
export async function getSeries(limit = 20) {
  const { data, error } = await supabase
    .from('series')
    .select(`
      *,
      seasons!inner (
        id,
        name,
        published,
        episodes!inner (
          id,
          title,
          video_url,
          published,
          premium
        )
      ),
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .eq('seasons.published', true)
    .eq('seasons.episodes.published', true)
    .not('seasons.episodes.video_url', 'is', null) // Only fetch series with watchable episodes
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching series:', error)
    return []
  }

  // Normalize vjs field
  const result = (data || []).map((item: any) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as Series[]
}

// Translated Content (content without VJs) - Enhanced with video URLs
export async function getTranslatedMovies(limit = 6) {
  const { data, error } = await supabase
    .from('movies')
    .select(`
      *,
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .is('vj_id', null)
    .not('video_url', 'is', null) // Only fetch movies with video URLs
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching translated movies:', error)
    return []
  }

  // Normalize vjs field
  const result = (data || []).map((item: any) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as Movie[]
}

export async function getTranslatedSeries(limit = 6) {
  const { data, error } = await supabase
    .from('series')
    .select(`
      *,
      seasons!inner (
        id,
        name,
        published,
        episodes!inner (
          id,
          title,
          video_url,
          published,
          premium
        )
      ),
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .is('vj_id', null)
    .eq('seasons.published', true)
    .eq('seasons.episodes.published', true)
    .not('seasons.episodes.video_url', 'is', null) // Only fetch series with watchable episodes
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching translated series:', error)
    return []
  }

  // Normalize vjs field
  const result = (data || []).map((item: any) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as Series[]
}

// Combined translated content
export async function getTranslatedContent(limit = 12) {
  const movies = await getTranslatedMovies(limit / 2)
  const series = await getTranslatedSeries(limit / 2)

  // Combine and add type field
  const combined = [
    ...movies.map(item => ({ ...item, type: 'movie' as const })),
    ...series.map(item => ({ ...item, type: 'series' as const }))
  ]

  // Sort by created_at
  return combined.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, limit)
}

// VJ Content (content WITH VJs) - Enhanced with video URLs
export async function getVJMovies(limit = 6) {
  const { data, error } = await supabase
    .from('movies')
    .select(`
      id, title, description, release_date, thumbnail_url, cover_image_url, duration, created_at,
      published, premium, recommend, popular, latest, video_url, videolink_url, trailer_url,
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .not('vj_id', 'is', null)
    .not('video_url', 'is', null) // Only fetch movies with video URLs
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching VJ movies:', error)
    return []
  }

  // Normalize vjs: Supabase returns as array, but your type expects object or null
  type GetVJMoviesItem = Movie & { vjs?: { id: string; name: string }[] | { id: string; name: string } | null };
  const result = (data || []).map((item: GetVJMoviesItem) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as (Movie & { vjs: { id: string; name: string } | null })[]
}

export async function getVJSeries(limit = 6) {
  const { data, error } = await supabase
    .from('series')
    .select(`
      id, title, description, release_date, thumbnail_url, cover_image_url, created_at,
      published, trailer_url,
      seasons!inner (
        id,
        name,
        published,
        episodes!inner (
          id,
          title,
          video_url,
          published,
          premium
        )
      ),
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .not('vj_id', 'is', null)
    .eq('seasons.published', true)
    .eq('seasons.episodes.published', true)
    .not('seasons.episodes.video_url', 'is', null) // Only fetch series with watchable episodes
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching VJ series:', error)
    return []
  }

  // Normalize vjs: Supabase returns as array, but your type expects object or null
  // Create a type that matches the actual Supabase response structure
  type SupabaseVJSeriesItem = {
    id: string;
    title: string;
    description?: string;
    release_date?: string;
    thumbnail_url?: string;
    cover_image_url?: string;
    created_at: string;
    published: boolean;
    trailer_url?: string;
    seasons: {
      id: string;
      name: string;
      published: boolean;
      episodes: {
        id: string;
        title: string;
        video_url?: string;
        published: boolean;
        premium: boolean;
      }[];
    }[];
    vjs?: { id: string; name: string }[] | { id: string; name: string } | null;
  };

  const result = (data || []).map((item: SupabaseVJSeriesItem) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as (Series & { vjs: { id: string; name: string } | null })[]
}

// Combined VJ content
export async function getVJContent(limit = 12) {
  const movies = await getVJMovies(limit / 2)
  const series = await getVJSeries(limit / 2)

  // Combine and add type field
  const combined = [
    ...movies.map(item => ({ ...item, type: 'movie' as const })),
    ...series.map(item => ({ ...item, type: 'series' as const }))
  ]

  // Sort by created_at
  return combined.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, limit)
}



// Genres API
export async function getGenres() {
  const { data, error } = await supabase
    .from('genres')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching genres:', error)
    return []
  }

  return data as Genre[]
}

// Search API - Enhanced with video URLs
export async function searchMovies(query: string, limit = 20) {
  const { data, error } = await supabase
    .from('movies')
    .select(`
      *,
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .not('video_url', 'is', null) // Only fetch movies with video URLs
    .ilike('title', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error searching movies:', error)
    return []
  }

  // Normalize vjs field
  const result = (data || []).map((item: any) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as Movie[]
}

export async function searchSeries(query: string, limit = 20) {
  const { data, error } = await supabase
    .from('series')
    .select(`
      *,
      seasons!inner (
        id,
        name,
        published,
        episodes!inner (
          id,
          title,
          video_url,
          published,
          premium
        )
      ),
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .eq('seasons.published', true)
    .eq('seasons.episodes.published', true)
    .not('seasons.episodes.video_url', 'is', null) // Only fetch series with watchable episodes
    .ilike('title', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error searching series:', error)
    return []
  }

  // Normalize vjs field
  type SupabaseSearchSeriesItem = {
    id: string;
    title: string;
    description?: string;
    release_date?: string;
    thumbnail_url?: string;
    cover_image_url?: string;
    created_at: string;
    published: boolean;
    trailer_url?: string;
    seasons: {
      id: string;
      name: string;
      published: boolean;
      episodes: {
        id: string;
        title: string;
        video_url?: string;
        published: boolean;
        premium: boolean;
      }[];
    }[];
    vjs?: { id: string; name: string }[] | { id: string; name: string } | null;
  };

  const result = (data || []).map((item: SupabaseSearchSeriesItem) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as unknown as Series[]
}

// Related content by genre - Enhanced with video URLs
export async function getRelatedMoviesByGenre(movieId: string, genreIds: string[], limit = 6) {
  const { data, error } = await supabase
    .from('movies')
    .select(`
      *,
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .not('video_url', 'is', null) // Only fetch movies with video URLs
    .neq('id', movieId)
    .overlaps('genre_ids', genreIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching related movies:', error)
    return []
  }

  // Normalize vjs field
  const result = (data || []).map((item: any) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as Movie[]
}

export async function getRelatedSeriesByGenre(seriesId: string, genreIds: string[], limit = 6) {
  const { data, error } = await supabase
    .from('series')
    .select(`
      *,
      seasons!inner (
        id,
        name,
        published,
        episodes!inner (
          id,
          title,
          video_url,
          published,
          premium
        )
      ),
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .eq('seasons.published', true)
    .eq('seasons.episodes.published', true)
    .not('seasons.episodes.video_url', 'is', null) // Only fetch series with watchable episodes
    .neq('id', seriesId)
    .overlaps('genre_ids', genreIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching related series:', error)
    return []
  }

  // Normalize vjs field
  const result = (data || []).map((item: any) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as unknown as Series[]
}

// Kilax Exclusive Content API - Enhanced with video URLs
export async function getKilaxExclusiveMovies(limit = 6) {
  const { data, error } = await supabase
    .from('movies')
    .select(`
      *,
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .eq('exclusive_from_kilax_movies', true)
    .not('video_url', 'is', null) // Only fetch movies with video URLs
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching Kilax exclusive movies:', error)
    return []
  }

  // Normalize vjs field
  const result = (data || []).map((item: any) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as Movie[]
}

export async function getKilaxExclusiveSeries(limit = 6) {
  const { data, error } = await supabase
    .from('series')
    .select(`
      *,
      seasons!inner (
        id,
        name,
        published,
        episodes!inner (
          id,
          title,
          video_url,
          published,
          premium
        )
      ),
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .eq('exclusive_from_kilax', true)
    .eq('seasons.published', true)
    .eq('seasons.episodes.published', true)
    .not('seasons.episodes.video_url', 'is', null) // Only fetch series with watchable episodes
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching Kilax exclusive series:', error)
    return []
  }

  // Normalize vjs field
  const result = (data || []).map((item: any) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as unknown as Series[]
}

// Combined Kilax exclusive content
export async function getKilaxExclusiveContent(limit = 12) {
  const movies = await getKilaxExclusiveMovies(limit / 2)
  const series = await getKilaxExclusiveSeries(limit / 2)

  // Combine and add type field
  const combined = [
    ...movies.map(item => ({ ...item, type: 'movie' as const })),
    ...series.map(item => ({ ...item, type: 'series' as const }))
  ]

  // Sort by created_at
  return combined.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, limit) as Array<(Movie | Series) & { type: 'movie' | 'series'; vjs: { id: string; name: string } | null }>
}

// Category API - Enhanced with video URLs
export async function getMoviesByCategory(category: string, limit = 20) {
  const { data, error } = await supabase
    .from('movies')
    .select(`
      *,
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .not('video_url', 'is', null) // Only fetch movies with video URLs
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching movies by category:', error)
    return []
  }

  // Normalize vjs field
  const result = (data || []).map((item: any) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as Movie[]
}

export async function getSeriesByCategory(category: string, limit = 20) {
  const { data, error } = await supabase
    .from('series')
    .select(`
      *,
      seasons!inner (
        id,
        name,
        published,
        episodes!inner (
          id,
          title,
          video_url,
          published,
          premium
        )
      ),
      vjs:vj_id (
        id,
        name
      )
    `)
    .eq('published', true)
    .eq('seasons.published', true)
    .eq('seasons.episodes.published', true)
    .not('seasons.episodes.video_url', 'is', null) // Only fetch series with watchable episodes
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching series by category:', error)
    return []
  }

  // Normalize vjs field
  const result = (data || []).map((item: any) => ({
    ...item,
    vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
  }));

  return result as unknown as Series[]
}