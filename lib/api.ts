import { supabase, Movie, Series, Genre } from './supabase'

// Helper to normalize vjs field (Supabase returns array, but type expects object or null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeVjs = (item: any) => ({
  ...item,
  vjs: Array.isArray(item.vjs) ? item.vjs[0] || null : item.vjs || null
});

// Simple series select (no inner joins - shows series even without episodes)
const SERIES_SELECT = `
  *,
  vjs:vj_id (
    id,
    name
  )
`;

// Movies API
export async function getMovies(limit = 20) {
  const { data, error } = await supabase
    .from('movies')
    .select(`*, vjs:vj_id (id, name)`)
    .eq('published', true)
    .not('video_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching movies:', error); return [] }
  return (data || []).map(normalizeVjs) as Movie[]
}

export async function getFeaturedMovie() {
  const { data, error } = await supabase
    .from('movies')
    .select(`*, vjs:vj_id (id, name)`)
    .eq('published', true)
    .eq('recommend', true)
    .not('video_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) { console.error('Error fetching featured movie:', error); return null }
  return normalizeVjs(data) as Movie
}

export async function getPopularMovies(limit = 6) {
  const { data, error } = await supabase
    .from('movies')
    .select(`
      id, title, description, release_date, thumbnail_url, cover_image_url, duration, premium, created_at,
      video_url, videolink_url, trailer_url,
      vjs:vj_id (id, name)
    `)
    .eq('published', true)
    .eq('popular', true)
    .not('video_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching popular movies:', error); return [] }
  return (data || []).map(normalizeVjs) as Movie[]
}

// Series API - Simple queries without mandatory episode inner joins
export async function getSeries(limit = 20) {
  const { data, error } = await supabase
    .from('series')
    .select(SERIES_SELECT)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching series:', error); return [] }
  return (data || []).map(normalizeVjs) as Series[]
}

export async function getTranslatedMovies(limit = 6) {
  const { data, error } = await supabase
    .from('movies')
    .select(`*, vjs:vj_id (id, name)`)
    .eq('published', true)
    .is('vj_id', null)
    .not('video_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching translated movies:', error); return [] }
  return (data || []).map(normalizeVjs) as Movie[]
}

export async function getTranslatedSeries(limit = 6) {
  const { data, error } = await supabase
    .from('series')
    .select(SERIES_SELECT)
    .eq('published', true)
    .is('vj_id', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching translated series:', error); return [] }
  return (data || []).map(normalizeVjs) as Series[]
}

export async function getTranslatedContent(limit = 12) {
  const movies = await getTranslatedMovies(limit / 2)
  const series = await getTranslatedSeries(limit / 2)
  const combined = [
    ...movies.map(item => ({ ...item, type: 'movie' as const })),
    ...series.map(item => ({ ...item, type: 'series' as const }))
  ]
  return combined.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, limit)
}

export async function getVJMovies(limit = 6) {
  const { data, error } = await supabase
    .from('movies')
    .select(`
      id, title, description, release_date, thumbnail_url, cover_image_url, duration, created_at,
      published, premium, recommend, popular, latest, video_url, videolink_url, trailer_url,
      vjs:vj_id (id, name)
    `)
    .eq('published', true)
    .not('vj_id', 'is', null)
    .not('video_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching VJ movies:', error); return [] }
  return (data || []).map(normalizeVjs) as (Movie & { vjs: { id: string; name: string } | null })[]
}

export async function getVJSeries(limit = 6) {
  const { data, error } = await supabase
    .from('series')
    .select(SERIES_SELECT)
    .eq('published', true)
    .not('vj_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching VJ series:', error); return [] }
  return (data || []).map(normalizeVjs) as (Series & { vjs: { id: string; name: string } | null })[]
}

export async function getVJContent(limit = 12) {
  const movies = await getVJMovies(limit / 2)
  const series = await getVJSeries(limit / 2)
  const combined = [
    ...movies.map(item => ({ ...item, type: 'movie' as const })),
    ...series.map(item => ({ ...item, type: 'series' as const }))
  ]
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

  if (error) { console.error('Error fetching genres:', error); return [] }
  return data as Genre[]
}

// Search API
export async function searchMovies(query: string, limit = 20) {
  const { data, error } = await supabase
    .from('movies')
    .select(`*, vjs:vj_id (id, name)`)
    .eq('published', true)
    .not('video_url', 'is', null)
    .ilike('title', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error searching movies:', error); return [] }
  return (data || []).map(normalizeVjs) as Movie[]
}

export async function searchSeries(query: string, limit = 20) {
  const { data, error } = await supabase
    .from('series')
    .select(SERIES_SELECT)
    .eq('published', true)
    .ilike('title', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error searching series:', error); return [] }
  return (data || []).map(normalizeVjs) as Series[]
}

// Related content by genre
export async function getRelatedMoviesByGenre(movieId: string, genreIds: string[], limit = 6) {
  const { data, error } = await supabase
    .from('movies')
    .select(`*, vjs:vj_id (id, name)`)
    .eq('published', true)
    .not('video_url', 'is', null)
    .neq('id', movieId)
    .overlaps('genre_ids', genreIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching related movies:', error); return [] }
  return (data || []).map(normalizeVjs) as Movie[]
}

export async function getRelatedSeriesByGenre(seriesId: string, genreIds: string[], limit = 6) {
  const { data, error } = await supabase
    .from('series')
    .select(SERIES_SELECT)
    .eq('published', true)
    .neq('id', seriesId)
    .overlaps('genre_ids', genreIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching related series:', error); return [] }
  return (data || []).map(normalizeVjs) as unknown as Series[]
}

// Kilax Exclusive Content API
export async function getKilaxExclusiveMovies(limit = 6) {
  const { data, error } = await supabase
    .from('movies')
    .select(`*, vjs:vj_id (id, name)`)
    .eq('published', true)
    .eq('exclusive_from_kilax_movies', true)
    .not('video_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching Kilax exclusive movies:', error); return [] }
  return (data || []).map(normalizeVjs) as Movie[]
}

export async function getKilaxExclusiveSeries(limit = 6) {
  const { data, error } = await supabase
    .from('series')
    .select(SERIES_SELECT)
    .eq('published', true)
    .eq('exclusive_from_kilax', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching Kilax exclusive series:', error); return [] }
  return (data || []).map(normalizeVjs) as unknown as Series[]
}

export async function getKilaxExclusiveContent(limit = 12) {
  const movies = await getKilaxExclusiveMovies(limit / 2)
  const series = await getKilaxExclusiveSeries(limit / 2)
  const combined = [
    ...movies.map(item => ({ ...item, type: 'movie' as const })),
    ...series.map(item => ({ ...item, type: 'series' as const }))
  ]
  return combined.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, limit) as Array<(Movie | Series) & { type: 'movie' | 'series'; vjs: { id: string; name: string } | null }>
}

// Category API
export async function getMoviesByCategory(category: string, limit = 20) {
  const { data, error } = await supabase
    .from('movies')
    .select(`*, vjs:vj_id (id, name)`)
    .eq('published', true)
    .not('video_url', 'is', null)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching movies by category:', error); return [] }
  return (data || []).map(normalizeVjs) as Movie[]
}

export async function getSeriesByCategory(category: string, limit = 20) {
  const { data, error } = await supabase
    .from('series')
    .select(SERIES_SELECT)
    .eq('published', true)
    .eq('category', category)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) { console.error('Error fetching series by category:', error); return [] }
  return (data || []).map(normalizeVjs) as unknown as Series[]
}